const axios = require('axios');
const { XMLParser, XMLBuilder, XMLValidator } = require('fast-xml-parser');
const fs = require('fs');
const LocalData = require('./localdata.js');
const PostCreator = require('./postcreator.js');
const PostPublisher = require('./postpublisher.js');

const MAX_POST_LENGTH = 500;
const MAX_DESCRIPTION_LENGTH = 250;

const parser = new XMLParser();
const local = new LocalData();
const postCreator = new PostCreator(MAX_POST_LENGTH, MAX_DESCRIPTION_LENGTH);

var M;

PostPublisher.mastodon().then((mastodon)=>{
    M = mastodon;
    getFeed()
    setInterval(getFeed, 10 * 60 * 1000);
    setInterval(local.cleanUpPostList, 48 * 60 * 60 * 1000);
});

async function getFeed() {
    try {
        //var M = await PostPublisher.mastodon();
        var postPublisher = new PostPublisher.PostPublisher(M);
        var response = await axios.get('https://store.steampowered.com/feeds/news/');
        if (response && response.data) {
            var XMLData = response.data;
            var feed = parser.parse(XMLData);
            var articleArray = feed.rss.channel.item;
            console.log("number of articles: " + articleArray.length)
            for (var i = 0; i < articleArray.length; i++) {
                var article = articleArray[i];
                var title = article.title;
                var link = article.link;
                var description = article.description;
                var date = new Date(article.pubDate);

                // get the article's id
                var guid = article.guid;
                // cheeck the article was not already posted
                var posted = true;
                try {
                    posted = await local.guidExists(guid)
                } catch (err) {
                    console.error("Error checking guid: " + err);
                }
                if (!posted) {
                    // add to the posts list
                    console.log(`---- POST ${i} ----`);
                    await local.addPost(guid, date);
                    console.log(guid);

                    // create post
                    
                    var post = await postCreator.createPost(title, link, description);

                    // if the post has an image, download it
                    var posted = false;
                    if (post.imagePath) {
                        console.log("uploading image: " + post.imagePath);
                        var localPath = await postCreator.createImage(post.imagePath);
                        // upload the image
                        if (localPath) {
                            var imageId = await postPublisher.uploadImage(localPath);
                            console.log("posting image: " + imageId);
                            var response = await postPublisher.postToMastodon(post.postText, imageId);
                            if (response && response.id) {
                                posted = true;
                                console.log("Posted with image");
                            }
                        }
                    }
                    if (!posted) {
                        var response = await postPublisher.postToMastodon(post.postText);
                        console.log(response);
                        console.log("posted without an image")
                    }


                } else {
                    console.log("already posted");
                }
                delay(1000)

            }
        }
    } catch (err) {
        console.error(err);
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}