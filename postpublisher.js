
const fs = require('fs');
const { login } = require('masto');

/**
 * Creates an instance of the Mastodon client by using data in the 'keys.json' file
 * @returns mastodon client
 */
const mastodon = async function () {
    var masto;
    try {
        masto = await login(getKeys());
    } catch (err) {
        console.error("Error signing into Mastodon. " + err);
    }
    return masto;
}

/**
 * Reads the file 'keys.json' and returns an object containing the url and access token.
 * @returns {url: String, accessToken: String}
 */
function getKeys() {
    var keys, config;
    try {
        keys = fs.readFileSync('keys.json');
        config = JSON.parse(keys);
        return {
            url: config.api_url,
            accessToken: config.access_token
        };
    } catch (err) {
        console.log("Error reading keys file: " + err);
    }
    return null;
}

class PostPublisher {
    constructor(masto) {
        this.M = masto;
    }

    /**
     * Toots a post containing the given text and adds an image
     * if the parameter image is not null
     * @param {String} post Text to be posted
     * @param {String} image Image to be added to the post
     * @returns Response of the API request to create a post
     */
    postToMastodon = async (post, image = null) => {
        if (image) {
            try {
                return await this.M.v1.statuses.create({
                    status: post,
                    visibility: 'public',
                    mediaIds: [image],
                });
            } catch (err) {
                console.error("Error tooting with an image: " + err);
            }
        } else {
            try {
                return await this.M.v1.statuses.create({
                    status: post,
                    visibility: 'public'
                });
            } catch (err) {
                console.error("Error tooting plain text: " + err);
            }
        }
    }

    /**
     * Uploads an image to Mastodon
     * @param {String} path Local path to the image 
     * @returns {String} Media id of the uploaded image. This can be used to add the image to a toot.
     */
    uploadImage = async (path) => {
        if (!fs.existsSync(path)) {
            console.log("Image does not exist: " + path)
            return null;
        }
        try {
            var response = await this.M.v2.mediaAttachments.create({
                file: fs.readFileSync(path),
                description: 'Image related to a Steam article',
            });
            console.log("Image id is " + response.id);
            fs.unlink(path, (err) => {
                if (err) console.error("Error deleting file: " + err)
            });
            return response.id;
        } catch (err) {
            console.error("Error uploading image: " + err);
        }
    }
}

module.exports = { PostPublisher, mastodon };