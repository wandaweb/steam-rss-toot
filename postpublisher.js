
const fs = require('fs');
const Mastodon = require('mastodon-api');

const M = new Mastodon(getKeys());

function getKeys() {
    var keys = fs.readFileSync('keys.json');
    var config = JSON.parse(keys);
    return config;
}

class PostPublisher {
    constructor() { }

    postToMastodon = async (post, image = null) => {
        if (image) {
            try {
                return await M.post('statuses', { status: post, media_ids: [image] });
            } catch (err) {
                console.error("Error tooting with an image: " + err);
            }
        } else {
            try {
                return await M.post('statuses', { status: post });
            } catch (err) {
                console.error("Error tooting plain text: " + err);
            }
        }
    }

    uploadImage = async (path) => {
        if (!fs.existsSync(path)) {
            console.log("Image does not exist: " + path)
            return null;
        }
        try {
            var response = await M.post('media', { file: fs.createReadStream(path) });
            console.log("Image id is " + response.data.id);
            fs.unlink(path, (err) => {
                if (err) console.error("Error deleting file: " + err)
            });
            return response.data.id;
        } catch (err) {
            console.error("Error uploading image: " + err);
        }
    }
}

module.exports = PostPublisher;