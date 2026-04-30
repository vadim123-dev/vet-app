from backend.models.animal import Animal
class Cat(Animal):

    def __init__(self, breed_id, name, weight, life_span, origin):
        super().__init__(breed_id, name, None, weight, life_span, origin)