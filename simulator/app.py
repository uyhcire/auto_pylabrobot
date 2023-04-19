import os
import socket
import subprocess
import tempfile

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel


app = FastAPI()


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
    try:
        temp_dir = tempfile.mkdtemp()
        script_path = os.path.join(temp_dir, "script.py")
        with open(script_path, "w") as script_file:
            script_file.write(payload.script_code)

        http_port, ws_port = get_next_available_ports()
        docker_command = [
            "docker",
            "run",
            "-v",
            f"{temp_dir}:/code",
            "-p",
            f"{http_port}:1337",
            "-p",
            f"{ws_port}:2121",
            os.environ["SIMULATOR_DOCKER_IMAGE"],
            "python",
            "/code/script.py",  # Execute script.py in the container
        ]

        subprocess.Popen(docker_command)

        return JSONResponse(
            content={
                "message": "Simulator container successfully launched.",
                "http_port": http_port,
                "ws_port": ws_port,
            }
        )
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="localhost", port=5000)
