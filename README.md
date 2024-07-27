# Taptab Backend API

## Description

This repository serves as the backend API of the Taptab CM and Taptab App.

## Version Notes

### 1.0.4
- Created the backend controller and endpoints for Players and Planner Schedules.
- Simplified the functions of player controller. Reduced the number of queries needed for the update functions to one.
- Simplified the endpoints for player routes.

### 1.0.3
- Created notes for deploying the backend to the live server.
- Removed unnecessary imports to the Storage Controller.
- Created Playlist Controller with its CRUD functions.
- Updated the DELETE function, Added the clearing of schedules in the planner where the playlist is used.

### 1.0.2.1
- Installed nodemon (Development only) to automatically restart the server for any file changes.
- Created the DELETE endpoint for Media Library
- Created the READ and UPDATE functions for Media Library Analytics
- Fixed an issue where the UPDATE MEDIA function only updates the name and removes its contents.
- Updates the query for retrieving media files to exclude all [deleted] items. Also added checks for ther GCS files related to the [deleted] file. 

### 1.0.2
- Installed @google-cloud/storage library
- Initialized the Media Library backend
- Created the CREATE, READ, and UPDATE functions
- Separated the signed URL generation code block, and GCP Storage bucket files retrieval to its own functions.
- Created global variables for storage, and buckets.
- Optimized the update function for the cloud storage.

### 1.0.1
- Created the foundation of the backend
- Created the routes for User Management

## Installation

To install this project, clone the repository and install the dependencies:

```bash
git clone https://github.com/vncntkyl/taptab-backend.git
cd taptab-backend
npm install
node app.js
