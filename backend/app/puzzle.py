# insert_puzzle.py
import json
import random
import psycopg
from psycopg.types.json import Jsonb
from dotenv import load_dotenv
import os

load_dotenv()

class Puzzle():
    def __init__(self, size):
        self.grid = [["0" for _ in range(size)] for _ in range(size)]
        self.words = []
        self.word_strings = []
        self.nodes = []
        self.c_nodes = []

    def insert_charline(self, x, y, length, direction, char):
        if direction:
            for row in range(y, min(y + length, len(self.grid))):
                if x < len(self.grid[0]) and not self.grid[row][x].isalpha():
                    self.grid[row][x] = char
        else:
            for col in range(x, min(x + length, len(self.grid[0]))):
                if y < len(self.grid) and not self.grid[y][col].isalpha():
                    self.grid[y][col] = char

    def fetch(self, x, y, length, direction=bool):
        if direction:
            return [self.grid[curr][x] for curr in range(y, y + length)]
        else:
            return self.grid[y][x:x + length]

    def insert_word(self, word, x, y, direction=bool, riddle="no_riddle"):
        puzzlet = f"#{word}#"
        if direction:
            y -= 1
        else:
            x -= 1

        window = self.fetch(x, y, len(puzzlet), direction)
        if not "#" in window:
            if direction:
                for i in range(len(puzzlet)):
                    self.grid[y+i][x] = puzzlet[i]
                self.insert_charline(x + 1, y + 1, len(word), direction, "%")
                self.insert_charline(x - 1, y + 1, len(word), direction, "%")
            else:
                self.grid[y] = self.grid[y][:x] + list(puzzlet) + self.grid[y][x+len(puzzlet):]
                self.insert_charline(x + 1, y + 1, len(word), direction, "%")
                self.insert_charline(x + 1, y - 1, len(word), direction, "%")
            
            wrd_id = len(self.words)
            self.words.append({
                "id": wrd_id,
                "word": word,
                "riddle": riddle,
                "coords": [x, y, len(word)],
                "direction": "down" if direction else "right"
            })
            self.word_strings.append(word)

    def get_json(self):
        blank_grid = []
        for line in self.grid:
            blank_grid.append(["L" if char.isalpha() else char for char in line])
        return {"id": random.randint(0, 10000), "blank": blank_grid, "grid": self.grid, "words": self.words}

    def log(self):
        for row in self.grid:
            print(list(''.join(row).replace("0", "_").replace("#", "_").replace("%", "_")))


def insert_puzzle_sync(puzzle_obj):
    HOST = "localhost"
    PORT = 5432
    DB = os.getenv("POSTGRES_DB")
    USER = os.getenv("POSTGRES_USER")
    PASSWORD = os.getenv("POSTGRES_PASSWORD")
    
    conn = psycopg.connect(
        host=HOST,
        port=PORT,
        dbname=DB,
        user=USER,
        password=PASSWORD
    )
    
    cur = conn.cursor()
    
    puzzle_dict = puzzle_obj.model_dump()
    
    cur.execute(
        """
        INSERT INTO "Puzzles" 
        (puzzle_id, lang, topic, difficulty, size, times_played, jsonb) 
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """,
        (
            puzzle_dict['puzzle_id'],
            puzzle_dict['lang'],
            puzzle_dict['topic'],
            puzzle_dict['difficulty'],
            puzzle_dict['size'],
            puzzle_dict.get('times_played', 0),
            Jsonb(puzzle_dict['jsonb'])
        )
    )
    
    conn.commit()
    cur.close()
    conn.close()
    print(f"Inserted puzzle {puzzle_dict['puzzle_id']}")


if __name__ == "__main__":
    from models import Puzzle as PZL
    
    pzl = Puzzle(18)
    pzl.insert_word("картошка", 3, 5, True, riddle="самый белорусский овощ")
    pzl.insert_word("морковка", 2, 9, False, "типо зайцы такое едят наверное")
    pzl.insert_word("мадагаскар", 2, 6, False, "в этом мультике был бегемот который любит больших и попастых")
    pzl.insert_word("колёса", 8, 2, True, "их можно (было) найти у оффисного стула и у паши техника")
    pzl.insert_word("рофл", 11, 16, False, "умора, потеха, веселуха - или же шутка в интернете")
    pzl.insert_word("жираф", 13, 12, True, "длинный чувак из мультика про который была загадка с бегемотом")
    pzl.insert_word("борат", 5, 3, True, "нрааааааааица")
    pzl.insert_word("огурец", 6, 9, True, "самый дорогой овощ сейчас в россии")
    pzl.insert_word("хуесос", 5, 11, False, "макан")
    pzl.insert_word("цыгане", 6, 14, False, "ненавижу, блять, [Х]!!!")
    pzl.insert_word("амонгас", 9, 9, True, "красный всегда убийца")
    pzl.insert_word("негр", 11, 13, True, "у него сосал Лимонов")
    pzl.insert_word("жопа", 13, 12, False, "это типо когда завал по работе или сгорел дом")
    pzl.insert_word("кожа", 10, 5, False)
    pzl.insert_word("сука", 2, 11, True, "длинный чувак из мультика про который была загадка с бегемотом")
    pzl.log()
    print()
    
    jsonpzl = pzl.get_json()
    pzl_obj = PZL(
        puzzle_id=jsonpzl["id"],
        lang="ru",
        topic="no_topic",
        difficulty="medium",
        size=len(jsonpzl["grid"]),
        times_played=0,
        jsonb=jsonpzl
    )
    
    insert_puzzle_sync(pzl_obj)
    print("DONE!")