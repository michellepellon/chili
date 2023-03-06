/**
 * server.js: The main entrypoint to the application.
 *
 * (C) 2023 Michelle Pellon
 * MIT LICENCE
 */

'use strict';

// Standard library dependencies
const http = require('http');

// Third-party dependencies
require("dotenv").config({ path: ".env" });
const express = require("express");
const bodyParser = require('body-parser');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { createTerminus } = require('@godaddy/terminus');
const { Sequelize } = require('sequelize');

const dbConnection = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  dialect: 'mysql',
  host: process.env.DB_HOST,
  pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
  }
});

// Constants
const PORT = process.env.NODE_DOCKER_PORT;

const app = express();
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(bodyParser.json());

// Configure API documentation
const apiDocOpts = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Chili API",
      version: "1.0.0",
    },
    servers: [
      {
        url: "http://localhost:8080/api-docs/",
      }
    ],
  },
  apis: ["./routes/*.js"],
};

const specs = swaggerJsdoc(apiDocOpts);
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(specs)
);

function onHealthCheck ({ state }) {
  try {
    dbConnection.authenticate();
    console.log('DB Connected');
    return Promise.resolve()
  } catch (error) {
    console.error("Unable to connect to the database:", error);
    return Promise.reject(new Error('Sequelize has disconnected.'));
  }
}

function onSignal () {
  console.log('server is starting cleanup')

  return new Promise((resolve, reject) => {
    dbConnection.connectionManager.close()
      .then(() => {
        console.info('Sequelize has disconnected.')
        resolve()
      })
      .catch(reject)
  })
}

async function startServer () {
  createTerminus(http.createServer(app), {
    logger: console.log,
    signal: 'SIGINT',
    healthChecks: {
      '/healthz': onHealthCheck,
    },

    onSignal
  }).listen(PORT || 8080)
}

startServer()
  .catch(err => console.error('Connection error', err.stack))