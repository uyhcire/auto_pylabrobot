import os
import socket
import subprocess
import tempfile
from typing import Generator

import docker
from fastapi import FastAPI
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel


app = FastAPI()
docker_client = docker.from_env()


@app.get("/")
def read_root():
    return {"Hello": "World"}


class CodePayload(BaseModel):
    script_code: str


def get_next_available_ports():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s1:
        s1.bind(("", 0))  # Bind to an available port
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s2:
            s2.bind(("", 0))  # Bind to an available port
            return (s1.getsockname()[1], s2.getsockname()[1])  # Return the port numbers


@app.post("/run-script")
def run_script(payload: CodePayload):
    temp_dir = tempfile.mkdtemp()
    script_path = os.path.join(temp_dir, "script.py")
    with open(script_path, "w") as script_file:
        script_file.write(payload.script_code)

    http_port, ws_port = get_next_available_ports()
    cidfile_temp_dir = tempfile.mkdtemp()
    cidfile_path = os.path.join(cidfile_temp_dir, "container_id")
    docker_command = [
        "timeout",
        # The simulator can be fairly slow, but a maximum runtime of 20 minutes should be reasonable.
        "1200",
        "docker",
        "run",
        "--cidfile",
        cidfile_path,
        "-v",
        f"{temp_dir}:/code",
        "-p",
        f"{http_port}:1337",
        "-p",
        f"{ws_port}:2121",
        os.environ["SIMULATOR_DOCKER_IMAGE"],
        "python",
        "-u",
        "/code/script.py",  # Execute script.py in the container
    ]

    process = subprocess.Popen(
        docker_command,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1,
    )
    # Hacky but works
    while True:
        if os.path.exists(cidfile_path):
            with open(cidfile_path, "r") as cidfile:
                container_id = cidfile.read().strip()
                if len(container_id) > 0:
                    break

    return JSONResponse(
        content={
            "message": "Simulator container successfully launched.",
            "container_id": container_id,
            "http_port": http_port,
            "ws_port": ws_port,
        }
    )


@app.get("/logs/{container_id}")
async def get_logs(container_id: str):
    # Use the Docker SDK to fetch logs from the specified container
    container = docker_client.containers.get(container_id)
    logs = container.logs().decode()

    return JSONResponse(content={"logs": logs})


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="localhost", port=5000)
