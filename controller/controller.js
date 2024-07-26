const sendResponse = (res, content, status = 200) => {
  res.status(status).send(content);
};

const Controller = {
  sendResponse,
};

module.exports = Controller;
