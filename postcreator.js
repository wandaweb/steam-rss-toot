const axios = require('axios');
const cheerio = require("cheerio");
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const PostPublisher = require('./postpublisher.js');

const pustPublisher = new PostPublisher();

class PostCreator {

    constructor(maxPostLength, maxDescriptionLength) {
        this.maxPostLength = maxPostLength;
        this.maxDescriptionLength = maxDescriptionLength;
    }

    /**
    * Creates the text to include in the post based on the title, link and description from
    * the RSS article and tries to download the first image from the article's HTML description
    * @param  {String} title Title of the article. 
    *                        This will be added to the start of the post text or 
    *                        after the game name if the game name is available
    * @param  {String} link  Link to the full article. This will be added at the 
    *                        end of the post
    * @param  {String} description The HTML description of the article. Will be  
    *                        changed to plain text and truncated to fit maxDescriptoinLength
    * @return {Promise<{postText: String, imagePath: String}>} The text to include in the post 
    *                        and the local path to the image downloaded from @description if 
    *                        @description contains a valid <img> element
    */
    createPost = async (title, link, description) => {
        var postText = "";

        // add the game name 
        if (link.includes("/app/")) {
            postText += await this.findGameName(link);
            postText += ": ";
        }

        // add the title
        postText += title;
        postText += "\n";

        // add a hashtag
        postText += "#SteamNews";

        // get an image from the description 
        var imagePath = null;
        try {
            var imageElement = "<img" + description.split("<img")[1].split(">")[0] + ">";
            var imagePath = this.extractSrc(imageElement);
            console.log("image path: " + imagePath);
        } catch (err) {
            console.error("Error getting the image path from an article: " + err);
        }

        // add the description
        var extractedText = this.extractText(description);
        var sentences = extractedText.match(/\(?[^\.\?\!]+[\.!\?]\)?/g);
        var descriptoinLength = 0;
        var descriptionText = "";
        var i = 0;
        if (extractedText.length > this.maxDescriptionLength) {
            while (descriptoinLength < this.maxDescriptionLength && i < sentences.length) {
                var length = sentences[i].length;
                if (descriptoinLength + length <= this.maxDescriptionLength) {
                    descriptoinLength += length;
                    descriptionText += sentences[i];
                }
                i++;
            }
            if (descriptionText.length == 0) {
                descriptionText = extractedText.slice(0, this.maxDescriptionLength) + "...";
            }
        }
        postText += "\n\n" + descriptionText;

        // add the link
        postText += "\n\n" + link;

        // shorten the post text if it's longer than maxPostLength
        if (postText.length > this.maxPostLength) {
            postText = postText.slice(0, this.maxPostLength - 3) + "...";
        }
        return { postText: postText, imagePath: imagePath };
    }

    /**
    * Extracts plain text from an HTML string
    * @param  {String} html an HTML string
    * @return {String} plain text
    */ 
    extractText = (html) => {
        try {
            var $ = cheerio.load(html);
            return $.text();
        } catch (err) {
            console.error("Error extracting text from the article description html. " + err);
        }
    }

    /**
    * Returns the value of the "src" attribute of an <img> element
    * @param  {String} html an HTML string
    * @return {String} The "src" attribute
    */ 
    extractSrc = (html) => {
        var $ = cheerio.load(html);
        return $("img").attr("src");
    }

    findGameName = async (link) => {
        try {
            var gameId = link.split("/app/")[1].split("/view/")[0];
            var steamAppLink = "https://store.steampowered.com/api/appdetails?appids=" + gameId;
            var response = await axios.get(steamAppLink);
            var gameInfo = response.data[gameId];
            var gameName = gameInfo.data.name;
            return gameName;
        } catch (err) {
            console.error("Error getting the game's name: " + err);
            return "";
        }
    }

    createImage = async (path) => {
        var localName = "tempimage" + uuidv4() + ".jpg";
        console.log("Local image name:" + localName);
        var tc = 0;
        try {
            var buffer = await this.downloadImage(path);
            await sharp(buffer).jpeg({ quality: 60 }).toFile(localName);
            return localName;
        } catch (err) {
            console.error("Error downloading image: " + err);
        }
    }

    downloadImage = async (path) => {
        var config = {
            method: 'get',
            url: path,
            responseType: 'stream'
        };
        return axios(config).then(response => {
            return new Promise((resolve, reject) => {
                let error = null;
                var buf = [];
                response.data.on('data', (chunk) => buf.push(chunk));
                response.data.on('error', err => {
                    error = err;
                    console.error(err);
                    data.close();
                });
                response.data.on('close', () => {
                    console.log("closing")
                    var buffer = Buffer.concat(buf);
                    if (!error) {
                        resolve(buffer);
                    } else {
                        reject(error);
                    }
                });
            });
        });
    }
}

module.exports = PostCreator;

