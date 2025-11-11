from flask import Request

def get_data(req: Request) -> dict:
    json = req.json

    if json is None:
        return {}

    return json
