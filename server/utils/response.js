const send = (res, data, status = 200) => res.status(status).json(data);

const fail = (res, message, status = 500) => res.status(status).json({ message });

module.exports = { send, fail };
