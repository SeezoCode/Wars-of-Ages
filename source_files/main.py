from fastapi import FastAPI
from pydantic import BaseModel
import numpy as np
from typing import List

# import ai


def unit_to_arr(num: int):
    arr = []
    for i in range(0, 10):
        if i == num:
            arr.append(1.0)
        else:
            arr.append(0.0)
    return arr


def translate_units_to_arr(units: list):
    arr = []
    for i, unit in enumerate(units):
        arr.append(unit_to_arr(unit))
    while len(arr) <= 12:
        arr.append(unit_to_arr(99))
    return arr


def prolong_allowed_units(allowed: List[int]):
    while len(allowed) <= 10:
        allowed.append(0)
    for i, elem in enumerate(allowed):
        allowed[i] = float(elem)
    return allowed


def prepare_entry(entry: list):
    player_units = translate_units_to_arr(entry[0])
    player_allowed_units = prolong_allowed_units(entry[1])
    ai_current = translate_units_to_arr(entry[2])
    ai_allowed_units = prolong_allowed_units(entry[4])
    return [player_units, player_allowed_units,
            ai_current, ai_allowed_units]


app = FastAPI()


@app.get("/{player}/{playerAvail}/{ai}/{aiAvail}")
def update_item(player, playerAvail, ai, aiAvail):
    print([player, playerAvail, ai, aiAvail])
    # entry = prepare_entry([player, playerAvail, ai, aiAvail])
    # arr = np.array(ai.parse_con([entry]))
    # pred = ai.model.predict(arr)
    # return {np.argmax(pred)}
    return 'success'
