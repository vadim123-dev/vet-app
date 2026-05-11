import requests
import re
from backend.models.dog import Dog
from backend.models.cat import Cat
from backend.config import Config


class AnimalDataService:
    
    def create_dog_from_json(self, json_item):
        name = json_item.get('name', 'Luna')
        height_str = json_item.get('height').get('metric')
        str_lst = height_str.split('-')
        str_lst[0] = 5 if str_lst[0].strip() == 'NaN' else str_lst[0]
        height_lst  = [int(x) for x in str_lst]
        weight_str = json_item.get('weight').get('metric')
        str_lst2 = weight_str.split('-')
        str_lst2[0] = 5 if str_lst2[0].strip() == 'NaN' else str_lst2[0]
        weight_lst = [int(x) for x in str_lst2]
        life_span_str = json_item.get('life_span')
        life_span_lst = [int(x) for x in re.findall(r'\d+', life_span_str)]
        bred_for = json_item.get('bred_for', 'cuddling')
        breed_id = json_item.get('id')
        origin = json_item.get('origin')
        return Dog(breed_id, name, height_lst, weight_lst, life_span_lst, bred_for, origin)
    

    def create_cat_from_json(self, json_item):
        name = json_item.get('name', 'Mushi')
        weight_str = json_item.get('weight').get('metric')
        str_lst2 = weight_str.split('-')
        str_lst2[0] = 5 if str_lst2[0].strip() == 'NaN' else str_lst2[0]
        weight_lst = [int(x) for x in str_lst2]
        life_span_str = json_item.get('life_span')
        life_span_lst = [int(x) for x in re.findall(r'\d+', life_span_str)]
        breed_id = json_item.get('id')
        origin = json_item.get('origin')
        return Cat(breed_id, name, weight_lst, life_span_lst, origin)   



    def _load_dogs(self):
        response = requests.get(Config.API_DOGS_DATA)
        response.raise_for_status()
        all_data_json = response.json()

        for one_item in all_data_json:
            dog = self.create_dog_from_json(one_item)
            self.dogs_dict[dog.breed_id] = dog


    def _load_cats(self):
        response = requests.get(Config.API_CATS_DATA)
        response.raise_for_status()
        all_data_json = response.json()

        for one_item in all_data_json:
            cat = self.create_cat_from_json(one_item)
            self.cats_dict[cat.breed_id] = cat

        print(self.cats_dict)    

    def _load_pet_data(self):
        self._load_dogs()
        self._load_cats()


    def __init__(self):
        self.dogs_dict = {} # id vs Dog object
        self.cats_dict = {} # id vs Cat object
        self._load_pet_data()




        


