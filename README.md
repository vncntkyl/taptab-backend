# Taptab Backend API

## Description

This repository serves as the backend API of the Taptab CM and Taptab App.

## Version Notes

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
