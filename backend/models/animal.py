class Animal:
    def __init__(self, breed_id, name, height, weight=None, life_span=None, origin=None):
        self.breed_id = breed_id
        self.name = name
        self.height = height
        self.weight = weight if weight is not None else [3, 5]
        self.life_span = life_span if life_span is not None else [10, 12]
        self.origin = origin
    