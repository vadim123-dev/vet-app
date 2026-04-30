from backend.models.animal import Animal
class Dog(Animal):
     
     def __init__(self, breed_id, name, height, weight, life_span, bred_for, origin):
          super().__init__(breed_id, name, height, weight, life_span, origin)
          self.bred_for = bred_for
