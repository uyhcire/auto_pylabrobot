# Use the official Python 3.10 base image
FROM python:3.10

# Install our forked version of PyLabRobot
RUN pip install websockets git+https://github.com/uyhcire/pylabrobot.git@48a1fc5

# Set the working directory
WORKDIR /code
