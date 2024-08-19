class Logger {
    static warning(...args) {
        console.log(`%c ${args.join(' ')}`, 'background: #FFFFD4; color: #808000;');
    }

    static error(...args) {
        console.log(`%c ${args.join(' ')}`, 'background: #FFDADA; color: #800000;');
    }

    static success(...args) {
        console.log(`%c ${args.join(' ')}`, 'background: #DEF3DE; color: #008000;');
    }

    static info(...args) {
        console.log(`%c ${args.join(' ')}`, 'background: #E9E9FF; color: #000080;');
    }
}

class Time {
    constructor(hour, minute) {
        this.hour = hour;
        this.minute = minute;
    }

    getHour() {
        return this.hour;
    }

    getMinute() {
        return this.minute;
    }

    getSeconds() {
        return this.hour * 3600 + this.minute * 60;
    }

    static fromSeconds(seconds) {
        const hour = Math.floor(seconds / 3600);
        const minute = Math.floor((seconds - hour * 3600) / 60);
        return new Time(hour, minute);
    }

    static isInBetween(start, end, time) {
        const startSeconds = start.getSeconds();
        const endSeconds = end.getSeconds();
        const timeSeconds = time.getSeconds();
        return timeSeconds >= startSeconds && timeSeconds <= endSeconds;
    }
}

class SlideShow {
    constructor() {
        this.hourElement = document.querySelector("#hour");
        this.minuteElement = document.querySelector("#minute");
        this.dateElement = document.querySelector("#date_element");
        this.lessonTitleElement = document.querySelector("#lesson_title");
        this.slideElement = document.querySelector(".frame-child");
        this.dataJson = {};
        this.timeOnSlides = 30000; // default time in seconds
        this.currentSlide = 0;
        this.timeOnCurrentSlide = 0;
        this.slides = [];
        this.gotten = { slides: false, data: false };
        this.animating = false;
        this.hideBackground = false;
        this.hideSlideshow = false;
        this.timeonly = false;

        this.init();
    }

    async init() {
        await this.fetchData();
        await this.fetchSlides();
        this.run();
        if (!this.hideSlideshow) {
            this.animateSlideChange(this.slides[this.currentSlide]);
        }
        if (this.hideBackground) {
            document.querySelector(".slide-169-1").style.backgroundColor = "black";
        }
        setInterval(() => this.run(), 500);
    }

    async fetchData() {
        try {
            const response = await fetch("data.json");
            this.dataJson = await response.json();
            Logger.success("Successfully fetched data from data.json");
            this.timeOnSlides = this.dataJson.timeOnSlides;
            this.gotten.data = true;
        } catch (error) {
            Logger.error("Failed to fetch data from data.json");
        }
    }

    async fetchSlides() {
        let index = 1;
        while (true) {
            const slide = await this.fetchSlide(index, "png");
            if (slide) {
                this.slides.push(slide);
                this.cacheSlide(slide);
                index++;
                continue;
            }

            const slideJPG = await this.fetchSlide(index, "jpg");
            if (slideJPG) {
                this.slides.push(slideJPG);
                this.cacheSlide(slideJPG);
                index++;
                continue;
            }

            break;
        }
        this.gotten.slides = true;
        Logger.info("Slides fetched successfully");
    }

    async fetchSlide(index, extension) {
        const url = `slides/slide${index}.${extension}`;
        const response = await fetch(url);
        return response.ok ? url : null;
    }

    cacheSlide(slideUrl) {
        const image = document.createElement("img");
        image.src = slideUrl;
        image.loading = "eager";
        image.style.display = "none";
        document.querySelector(".cache_images").appendChild(image);
    }

    run() {
        if (!this.gotten.slides || !this.gotten.data) {
            Logger.info("Waiting for data and slides");
            return;
        }

        if (this.getLesson()) {
            if (this.getLesson().timeOnly === true && !this.timeonly) {
                this.enableTimeOnly();
                return;
            } else {
                if (this.getLesson().timeOnly === false && this.timeonly) {
                    Logger.info("Disabling time only");
                    this.disableTimeOnly();
                }
            }
        }

        Logger.info("Running Slideshow: ", this.timeOnCurrentSlide, this.timeOnSlides);

        this.updateTime();
        this.updateDate();
        this.updateLessonTitle();
        this.manageSlides();
    }

    updateTime() {
        if (this.timeonly) {
            this.updateTimeOnly();
            return;
        };
        const date = new Date();
        const hours = date.getHours();
        const minutes = date.getMinutes();
        this.hourElement.innerHTML = hours < 10 ? "0" + hours : hours;
        this.minuteElement.innerHTML = minutes < 10 ? "0" + minutes : minutes;
    }

    updateDate() {
        const date = new Date();
        const year = date.getFullYear().toString().substr(2);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        if (this.timeonly) {
            document.querySelector(".dateonly").innerHTML = `${day < 10 ? "0" + day : day}.${month < 10 ? "0" + month : month}.${year}`;
            return;
        };
        this.dateElement.innerHTML = `${day < 10 ? "0" + day : day}.${month < 10 ? "0" + month : month}.${year}`;
    }

    updateLessonTitle() {
        if (this.timeonly) {
            this.lessonTitleElement.innerHTML = "";
            return;
        };

        const date = new Date();
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const currentTime = new Time(hours, minutes);

        const currentLesson = this.dataJson.lessons.find((lesson) => {
            const start = lesson.start.split(":");
            const end = lesson.end.split(":");
            const startTime = new Time(parseInt(start[0]), parseInt(start[1]));
            const endTime = new Time(parseInt(end[0]), parseInt(end[1]));

            return Time.isInBetween(startTime, endTime, currentTime);
        });

        this.hideSlideshow = currentLesson ? currentLesson.showSlides === false : false;
        this.hideBackground = currentLesson ? currentLesson.showBackground === false : false;

        this.lessonTitleElement.innerHTML = currentLesson ? currentLesson.title.toUpperCase() : "";
    }

    getLesson() {
        const date = new Date();
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const currentTime = new Time(hours, minutes);

        return this.dataJson.lessons.find((lesson) => {
            const start = lesson.start.split(":");
            const end = lesson.end.split(":");
            const startTime = new Time(parseInt(start[0]), parseInt(start[1]));
            const endTime = new Time(parseInt(end[0]), parseInt(end[1]));

            return Time.isInBetween(startTime, endTime, currentTime);
        });
    }

    manageSlides() {
        if (this.hideSlideshow || this.timeonly) {
            this.slideElement.style.backgroundImage = "none";
            return;
        }

        if (this.slides.length === 0) {
            this.slideElement.innerHTML = "No slides found";
            this.slideElement.style.display = "flex";
            this.slideElement.style.justifyContent = "center";
            this.slideElement.style.alignItems = "center";
            return;
        }

        if (this.slideElement.innerHTML === "No slides found") {
            this.slideElement.innerHTML = "";
            this.slideElement.style.display = "block";
        }

        if (this.timeOnCurrentSlide >= this.timeOnSlides) {
            this.currentSlide = (this.currentSlide + 1) % this.slides.length;
            this.timeOnCurrentSlide = 0;
            this.animateSlideChange(this.slides[this.currentSlide]);
            Logger.info(`Switched to slide ${this.currentSlide + 1}`);
        }

        this.timeOnCurrentSlide += 500;
    }

    animateSlideChange(slide) {
        if (this.animating) return;
        this.animating = true;

        const newSlide = document.createElement("div");
        newSlide.style.backgroundImage = `url(${slide})`;
        newSlide.style.position = "absolute";
        newSlide.style.top = "0";
        newSlide.style.left = "0";
        newSlide.style.bottom = "0";
        newSlide.style.right = "0";
        newSlide.style.backgroundSize = "cover";
        newSlide.style.opacity = "0";
        newSlide.style.zIndex = "1";
        newSlide.style.borderRadius = "5px";
        newSlide.setAttribute("data-animation_slide", "true");
        newSlide.style.animation = "fadeIn 1s forwards";

        this.slideElement.appendChild(newSlide);

        setTimeout(() => {
            this.slideElement.style.backgroundImage = `url(${slide})`;
            this.slideElement.removeChild(this.slideElement.firstChild);
            this.animating = false;
        }, 1000);
    }

    enableTimeOnly() {
        if (this.getLesson().timeonly === false && this.timeonly) {
            Logger.info("Attempted to enable time only while already enabled");
            return
        };
        if (document.querySelector("#blackDiv")) return;
        var blackDiv = document.createElement("div");
        blackDiv.style.backgroundColor = "black";
        blackDiv.style.position = "absolute";
        blackDiv.id = "blackDiv";
        blackDiv.style.top = "0";
        blackDiv.style.left = "0";
        blackDiv.style.bottom = "0";
        blackDiv.style.right = "0";
        blackDiv.style.zIndex = "100";
        blackDiv.style.animation = "fadeIn 2s forwards";
        document.querySelector(".slide-169-1").appendChild(blackDiv);


        setTimeout(() => {
            document.querySelector("#blackDiv").remove();
            this.timeonly = true;
            this.hideBackground = true;
            document.querySelector(".slide-169-1").style.backgroundColor = "black";
            this.hideSlideshow = true;
            document.querySelector(".frame-child").style.display = "none";
            this.lessonTitleElement.innerHTML = "";
            this.dateElement.innerHTML = "";
            this.hourElement.parentElement.style.display = "none";
            this.hideSlideshow = true;
            var icon = document.querySelector(".group-icon")

            var iconClone = icon.cloneNode(true);
            icon.style.display = "none";
            console.log(icon, iconClone)
            iconClone.querySelectorAll("path").forEach((path) => {
                path.style.fill = "currentColor";
            });
            iconClone.id = "newIconClone";
            iconClone.style.mixBlendMode = "normal";
            iconClone.style.fill = "currentColor";
            iconClone.style.color = "#696969"
            iconClone.style.animation = "fadeIn 2s forwards";

            document.querySelector(".slide-169-1").appendChild(iconClone);


            var newTimeElement = document.createElement("div");
            newTimeElement.classList.add("timeonly");
            newTimeElement.innerHTML = `<span id="timeonly_hour"></span>:<span id="timeonly_minute"></span>`;
            document.querySelector(".slide-169-1").appendChild(newTimeElement);
            this.updateTimeOnly();

            var newDateElement = document.createElement("div");
            newDateElement.classList.add("dateonly");
            newDateElement.innerHTML = `<span id="timeonly_date"></span>`;
            document.querySelector(".slide-169-1").appendChild(newDateElement);
            this.updateDate();
        }, 2000);
    }

    disableTimeOnly() {
        if (document.querySelector("#transitionDiv")) {
            Logger.info("Attempted to disable time only while transitioning");
            return;
        };
        var blackDiv = document.createElement("div");
        blackDiv.style.backgroundColor = "#102e5a";
        blackDiv.style.position = "absolute";
        blackDiv.id = "transitionDiv";
        blackDiv.style.top = "0";
        blackDiv.style.left = "0";
        blackDiv.style.bottom = "0";
        blackDiv.style.right = "0";
        blackDiv.style.zIndex = "100";
        blackDiv.style.animation = "fadeIn 2s forwards";
        document.querySelector(".slide-169-1").appendChild(blackDiv);

        setTimeout(() => {
            // document.querySelector("#transitionDiv").remove();
            this.timeonly = false;
            this.hideBackground = false;
            document.querySelector(".slide-169-1").style.backgroundColor = "#102e5a";
            this.hideSlideshow = false;
            this.slideElement.style.display = "block";
            document.querySelector(".frame-child").style.display = "block";
            this.lessonTitleElement.innerHTML = "";
            this.dateElement.innerHTML = "";
            this.hourElement.parentElement.style.display = "block";
            this.hideSlideshow = false;
            var icon = document.querySelector(".group-icon")
            icon.style.display = "block";
            document.querySelector(".slide-169-1").removeChild(document.querySelector("#newIconClone"));


            document.querySelector(".timeonly").remove();
            document.querySelector(".dateonly").remove();

            this.animateSlideChange(this.slides[this.currentSlide]);
            this.updateLessonTitle();

            this.updateDate();
            this.updateTime();

            const transitionDiv = document.querySelector("#transitionDiv");
            // fade out transition div
            transitionDiv.style.animation = "fadeOut 1s forwards";
            setTimeout(() => {
                transitionDiv.remove();
            }, 1000);
        }, 2000)
    }

    updateTimeOnly() {
        const date = new Date();
        const hours = date.getHours();
        const minutes = date.getMinutes();
        document.querySelector("#timeonly_hour").innerHTML = hours < 10 ? "0" + hours : hours;
        document.querySelector("#timeonly_minute").innerHTML = minutes < 10 ? "0" + minutes : minutes;
    }
}

new SlideShow();
