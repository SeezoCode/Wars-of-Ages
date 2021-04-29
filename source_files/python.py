import os
import json

from typing import List

array = []
i = 0


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
    ai_prediction = translate_units_to_arr(entry[3])
    ai_allowed_units = prolong_allowed_units(entry[4])
    # ai_money_spent = entry[5] / 135
    return [[player_units, player_allowed_units,
            ai_current, ai_allowed_units], ai_prediction]


for filename in os.listdir(os.getcwd() + '/dataset'):
    if filename.startswith('dataset'):
        with open('dataset/' + filename, 'r', encoding='utf-8') as f:
            parsed = json.loads(f.read())
            print(parsed[0])
            for entry in parsed:
                array.append(prepare_entry(entry))

print(array[0])


with open('concatenated.json', 'w') as f:
    text = json.dumps(array)
    f.write(text)

