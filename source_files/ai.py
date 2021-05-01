import numpy as np
from tensorflow import keras
from tensorflow.keras import layers
import json


def parser_of_elem(individual_data: list):
    player_units = np.array(individual_data[0][0], dtype=np.float32)
    player_allowed_units = np.array(individual_data[0][1], dtype=np.float32)
    ai_current = np.array(individual_data[0][2], dtype=np.float32)
    ai_allowed_units = np.array(individual_data[0][3], dtype=np.float32)
    ai_prediction = np.array(individual_data[1], dtype=np.float32)
    return [player_units, player_allowed_units, ai_current, ai_allowed_units], ai_prediction
    # return [player_allowed_units, ai_allowed_units], ai_prediction


def parse_con(parsed_data: list):
    def flatten(S):
        if S != []:
            if isinstance(S[0], list):
                return flatten(S[0]) + flatten(S[1:])
            return S[:1] + flatten(S[1:])
        return S
    arr = []
    pred = []
    for elem in parsed_data:
        arr.append(flatten(elem[0]))
        pred.append(elem[1][0])
    return np.array(arr), np.array(pred)



f = open('concatenated.json', 'r')
data = json.loads(f.read())
x_train, y_train = parse_con(data)
f.close()

# f = open('concatenated_eval.json', 'r')
# data = json.loads(f.read())
# x_val, y_val = parse_con(data)
# f.close()

print(x_train.shape)

model = keras.models.Sequential()
model.add(layers.Dense(282, activation='relu', input_shape=(x_train.shape[1:])))
model.add(layers.Dense(10, activation='relu'))
model.add(layers.Dense(10, activation='sigmoid'))

model.compile(optimizer='rmsprop',
                      loss='categorical_crossentropy',
                      metrics=['accuracy'])


ep = 11
history = model.fit(x_train,
                    y_train,
                    epochs=ep,
                    batch_size=512,
                    # validation_data=(x_val, y_val)
                    )
