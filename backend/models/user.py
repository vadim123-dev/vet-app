from backend.models.pet import Pet
class User():

    def __init__(self, id, user_name, first_name, last_name, gender, city, password_hash, telephone, pets: dict[str, Pet] | None = {}):
        self.id = id
        self.user_name = user_name
        self.first_name = first_name
        self.last_name = last_name
        self.gender = gender
        self.city = city
        self.telephone = telephone
        self.pets = pets
        self.password_hash = password_hash


    def to_dict(self):
        return {
            "id" : self.id,
            "user_name" : self.user_name,
            "first_name" : self.first_name,
            "last_name" : self.last_name,
            "gender" : self.gender,
            "city" : self.city,
            "telephone" : self.telephone,
            "pets" : {
                pet_id : pet.to_dict()
                for pet_id, pet in self.pets.items()
            }

        }    