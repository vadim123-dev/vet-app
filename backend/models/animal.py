class Animal:
    def __init__(self, breed_id, name, height, weight=[3,5], life_span=[10,12], origin=None):
        self.breed_id = breed_id
        self.name = name
        self.height = height
        self.weight = weight
        self.life_span = life_span
        self.origin = origin
    