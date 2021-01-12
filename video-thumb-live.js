#!/usr/bin/env node
const http = require('http')
const url = require('url')
const { execSync } = require('child_process');

// Project variables
const project_id = 'cardboard-live'
const key_file_path = "../cardboard-live-firebase-adminsdk-47qyc-746345424b.json"

//Admin
const admin = require('firebase-admin')
const fbServiceAccount = require(key_file_path);
admin.initializeApp({
    credential: admin.credential.cert(fbServiceAccount),
    databaseURL: `https://${project_id}.firebaseio.com`
})

// AW Wasabi
const AWS = require('aws-sdk')
const s3 = new AWS.S3({
    correctClockSkew: true,
    endpoint: 's3.us-east-1.wasabisys.com',
    accessKeyId: '0QCM752BDQ9L5G5CAT0U',
    secretAccessKey: 'aeGUw3eCIHFN08bvKY08I6eBeP9lNsRBJFEve137',
    region: 'us-east-1',
    logger: console
})

//Storage
const { Storage } = require('@google-cloud/storage');
const gcs = new Storage({
    projectId: project_id,
    keyFilename: key_file_path
});
const gcsBucket = gcs.bucket(`${project_id}.appspot.com`)


// Create server
http.createServer(async function (req, res) {

    // Parse query parameter
    const queryObject = url.parse(req.url, true).query

    const headers = {
        "Access-Control-Allow-Origin": "*",
        'Content-Type': 'text/html'
    }
    res.writeHead(200, headers);

    // Create variables
    let key = null

    // Throw error if storage_key is missing
    if (!queryObject.key) {
        res.end('missing argument "key"')
        return
    } else key = queryObject.key //storage key

    // Extrapolate variables from key
    let userId = key.split('/')[1]
    let docId = key.split('/')[2].split('.')[0]

    // Get download url
    const dlUrl = await sign_wasabi_download_url(key)

    // Codec
    const codec = await get_codec(dlUrl)

    // Duration in seconds
    const dur = await get_duration(dlUrl)

    // Extract thumbnail
    const filePath = await get_thumbnail(dlUrl, docId, dur)

    // Upload thumbnail
    const gcsDest = `users/${userId}/thumbnails/${docId}.jpeg`
    await upload_thumb(filePath, gcsDest)

    // Update Firestore
    update_firestore(userId, docId, codec)

    // Send response
    res.end('Success')
    //res.end(err)



}).listen(8091, 'localhost')

console.log('video-thumb live server running on port 8091')

// Get signed download url
async function sign_wasabi_download_url(key) {

    return s3.getSignedUrl(
        "getObject",
        {
            Bucket: project_id,
            Key: key,
            Expires: 21600
        }
    )
}

// Get video codec
async function get_codec(dlUrl) {

    return execSync(`ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 "${dlUrl}"`).toString()
}

// Get video duration
async function get_duration(dlUrl) {

    return execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${dlUrl}"`).toString()
}


// Create thumbnail from video
async function get_thumbnail(dlUrl, docId, dur) {

    // Get point of thumb extraction
    const at = dur > 20 ? 10 : dur / 2

    // Make sure file doesn't already exist
    try {
        // Extract and save
        execSync(`ffmpeg -i "${dlUrl}" -ss ${at} -vframes 1 -filter:v scale=450:-1 -qscale:v 7 ./tmp/thumbs/${docId}.jpeg`)
    } catch {
        console.log('This file already exists. Skipping download')
    }

    return `./tmp/thumbs/${docId}.jpeg`
}

// Uplaod thumb
async function upload_thumb(filePath, dest) {

    // Uploads a local file to the bucket
    await gcsBucket.upload(filePath, {
        destination: dest,
        metadata: {
            cacheControl: 'public, max-age=31536000',
        },
    });

    // Delete tmp file
    execSync(`rm ${filePath}`)

    return
}

// Save new info to Firestore
async function update_firestore(userId, docId, codec) {

    // Update Firestore doc with thumbnail storage_key and codec
    await admin.firestore().collection('users').doc(userId).collection('files').doc(docId).update({
        thumbnail_key: `users/${userId}/thumbnails/${docId}.jpeg`,
        video_codec: codec
    }).then(() => {
        console.log("Thumbnail uploaded successfully.")
    }).catch((err) => console.error('Could not upload ....', userId, err))

    return
}

