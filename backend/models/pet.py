class Pet():

    def __init__(self, type, breed, name):
        self.type = type
        self.breed = breed
        self.name = name


    def to_dict(self):
        return {
            "type"  : self.type,
            "breed" : self.breed,
            "name"  : self.name
        }    