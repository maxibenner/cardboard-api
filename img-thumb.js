#!/usr/bin/env node
const http = require('http')
const url = require('url')
const { v4: uuidv4 } = require('uuid');
const sharp = require("sharp");

// Project variables
const project_id = process.env.PROJECT_ID;
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

//Admin
const admin = require('firebase-admin')
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: `https://${project_id}.firebaseio.com`
    })
}

// AW Wasabi
const AWS = require('aws-sdk')
const s3 = new AWS.S3({
  correctClockSkew: true,
  endpoint: process.env.AWS_ENDPOINT,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
  logger: console,
});

//Storage
const { Storage } = require('@google-cloud/storage')
const gcs = new Storage({
    projectId: project_id,
    credentials: serviceAccount
});
const gcsBucket = gcs.bucket(`${project_id}.appspot.com`)


// Export handler for router
module.exports.handleRequest = async function(req, res) {

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

    // Thumbnail
    create_upload_thumbnail(key).then(() => {

        // Send response
        res.end('Created and uploaded thumbnail.')

    }).catch((err) => {
        console.log(err)
        res.end(err)
    })

}


// Create image thumbnail and send to gcs
async function create_upload_thumbnail(storage_key) {

    const newThumbName = uuidv4()

    // Get owner and docId from storage_key
    const owner = storage_key.split('/')[1]
    const docId = storage_key.split('/')[2].split('.')[0]

    // 3. Save to file pipeline
    var file = gcsBucket.file(`users/${owner}/thumbnails/${newThumbName}.jpeg`).createWriteStream({ contentType: 'image/jpeg' })
        .on('error', (err) => {
            console.warn(err)
            return
        })
        .on('finish', () => {
            // Write thumbnail to firestore
            admin.firestore().collection('users').doc(owner).collection('files').doc(docId).update({
                thumbnail_key: `users/${owner}/thumbnails/${newThumbName}.jpeg`
            }).then(() => {
                return console.log("Thumbnail uploaded successfully.")
            }).catch((err) => console.error('Could not upload ....', owner, err))

        });

    // 2. Resize
    const pipeline = sharp()
    pipeline.resize(450).jpeg({
        quality: 50
    }).pipe(file);

    // 1. Stream file from Wasabi
    const stream = s3.getObject({
        Bucket: project_id,
        Key: storage_key
    }).createReadStream().on('error', error => {
        return console.log(error)
    });
    stream.pipe(pipeline);

}

