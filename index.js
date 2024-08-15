var hour = document.querySelector("#hour"); // HTMLParagraphElement
var minute = document.querySelector("#minute"); // HTMLParagraphElement

var dateElement = document.querySelector("#date_element"); // HTMLParagraphElement

var lessonTitleElement = document.querySelector("#lesson_title"); // HTMLParagraphElement
var slideElement = document.querySelector(".frame-child"); // HTMLDivElement

// get data from "data.json"
var dataJson = {};


const logger = (...args) => ({
    warning: () => {
        console.log(`%c ${args.join(' ')}`, 'background: #FFFFD4; color: #808000;')
    },
    error: () => {
        console.log(`%c ${args.join(' ')}`, 'background: #FFDADA; color: #800000;')
    },
    success: () => {
        console.log(`%c ${args.join(' ')}`, 'background: #DEF3DE; color: #008000;')
    },
    info: () => {
        console.log(`%c ${args.join(' ')}`, 'background: #E9E9FF; color: #000080;')
    },
})

const getData = async () => {
    await fetch("data.json")
        .then((response) => response.json())
        .then((data) => {
            dataJson = data;
        });
    logger("Successfully fetched data from data.json").success();
}

var timeOnSlides = dataJson.timeOnSlides || 30; // in seconds
var timeOnSlidesInMs = timeOnSlides * 1000;
var currentSlide = 0;
var timeOnCurrentSlide = 0;

var slides = [];

var gotten = {
    slides: false,
    data: false,
};

const addSlideCache = (slideUrl) => {
    const image = document.createElement("img");
    image.src = slideUrl;
    image.loading = "eager";
    image.style.display = "none";
    document.querySelector(".cache_images").appendChild(image);
}

const getSlides = async () => {
    var slidIndex = 1;
    var slides = [];
    while (true) {
        const slide = await fetch(`slides/slide${slidIndex}.png`);
        if (slide.status === 404) {
            const slideJPG = await fetch(`slides/slide${slidIndex}.jpg`);
            if (slideJPG.status === 404) {
                break;
            } else {
                slides.push(`slides/slide${slidIndex}.jpg`);
                slidIndex++;
                continue;
            }
        } else {
            slides.push(`slides/slide${slidIndex}.png`);
            slidIndex++;
        }
    }
    return slides;
}

var animating = false;

const animateSlideChange = (slide) => {
    animating = true;
    var slideElement = document.querySelector(".frame-child");
    if (slideElement.firstChild) {
        if (slideElement.firstChild.getAttribute("data-animation_slide")) {
            return;
        }
    }

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
    newSlide.setAttribute("data-animation_slide", "true");

    newSlide.style.animation = "fadeIn 1s forwards";

    slideElement.appendChild(newSlide);

    // wait for the animation to finish
    setTimeout(() => {
        if (slideElement.firstChild) {
            if (slideElement.firstChild.getAttribute("data-animation_slide")) {
                slideElement.style.backgroundImage = `url(${slide})`;
                slideElement.style.animation = "none";
                animating = false;
                slideElement.removeChild(slideElement.firstChild);
            }
        }
    }, 1000);
}

const runData = () => {
    if (slides.length === 0) {
        getSlides().then((slidesData) => {
            slides = slidesData;

            slidesData.map((slid) => {
                addSlideCache(slid);
            })

            console.log(slidesData);
        });
        gotten.slides = true;

    }

    if (!gotten.data) {
        getData().then(() => {
            gotten.data = true;
        });
    }

    if (timeOnSlides !== dataJson.timeOnSlides) {
        timeOnSlides = dataJson.timeOnSlides || 30;
        timeOnSlidesInMs = timeOnSlides * 1000;
    }

    if (!gotten.slides || !gotten.data) {
        logger("Waiting for data and slides").info();
        return;
    }

    const date = new Date();
    const h = date.getHours();
    const m = date.getMinutes();

    hour.innerHTML = h < 10 ? "0" + h : h;
    minute.innerHTML = m < 10 ? "0" + m : m;

    // set date_element text to "15.08.24"
    const year = date.getFullYear().toString().substr(2);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    dateElement.innerHTML = `${day < 10 ? "0" + day : day}.${month < 10 ? "0" + month : month}.${year}`;

    const currentLesson = dataJson.lessons.find((lesson) => {
        const start = lesson.start.split(":");
        const end = lesson.end.split(":");
        const startHour = parseInt(start[0]);
        const startMinute = parseInt(start[1]);
        const endHour = parseInt(end[0]);
        const endMinute = parseInt(end[1]);

        // return h >= startHour && h <= endHour && m >= startMinute && m <= endMinute;
        return Time.isInBetween(new Time(startHour, startMinute), new Time(endHour, endMinute), new Time(h, m));
    });


    if (currentLesson) {
        lessonTitleElement.innerHTML = currentLesson.title.toUpperCase();
    } else {
        lessonTitleElement.innerHTML = "";
    }

    if (slides.length > 0) {
        if (slideElement.innerHTML === "No slides found") {
            slideElement.innerHTML = "";
            slideElement.style.display = "block";
            animateSlideChange(slides[currentSlide]);
        }
        // get the current slide
        const slide = slides[currentSlide];

        if (timeOnCurrentSlide >= timeOnSlidesInMs) {
            currentSlide++;
            timeOnCurrentSlide = 0;
            animateSlideChange(slide);

        }

        if (currentSlide >= slides.length) {
            currentSlide = 0;
            animateSlideChange(slides[currentSlide]);
        }

        timeOnCurrentSlide += 500;

        console.log(timeOnCurrentSlide, timeOnSlidesInMs);
    } else {
        // slideElement.style.backgroundImage = "";
        if (slideElement.children.length < 1) {
            slideElement.innerHTML = "No slides found";
            slideElement.style.display = "flex";
            slideElement.style.justifyContent = "center";
            slideElement.style.alignItems = "center";
        }
    }
}

runData();

setInterval(() => {
    runData();
}, 500);

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