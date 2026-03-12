import json
import random

class Puzzle():

    def __init__(self, size):
        self.grid = [["0" for _ in range(size)] for _ in range(size)]
        self.words = []

    def read(self):
        return # сделать чтобы можно было читать из файла

    def fetch(self, x, y, length, direction=bool):
        if direction:
            return [self.grid[curr][x] for curr in range(y, y + length)]
        else:
            return self.grid[y][x:x + length]
    
    def insert_charline(self, x, y, length, direction, char):
        if direction:
            for row in range(y, min(y + length, len(self.grid))):
                if x < len(self.grid[0]) and not self.grid[row][x].isalpha():
                    self.grid[row][x] = char
        else:
            for col in range(x, min(x + length, len(self.grid[0]))):
                if y < len(self.grid) and not self.grid[y][col].isalpha():
                    self.grid[y][col] = char

    def insert(self, word, x, y, direction=bool, riddle="no_riddle"): # down --> True, right --> False 
        puzzlet = f"#{word}#" # add hashes where to mark prohibited intersections
        if direction:
            y -= 1
        else:
            x -=1

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
            
            self.words.append({ # storing word-data
                "id": len(self.words),
                "word": word,
                "riddle": riddle,
                "coords": [x, y, len(word)],
                "direction": "down" if direction else "right"
                })

        else:
            print("conflict has been detected") # надо детектить конфликты наверное
            return
            

    def log(self):
        for row in self.grid:
            print(row)

    def json(self):

        blank_grid = []
        for line in self.grid:
            blank_grid.append(["L" if char.isalpha() else char for char in line]) # blank grid will be parsed by client to avoid cheating

        return {"id": random.randint(0, 10000), "blank": blank_grid, "grid": self.grid, "words": self.words}


if __name__ == "__main__":
    pzl = Puzzle(18)
    pzl.insert("картошка", 3, 5, True, riddle="самый белорусский овощ")
    pzl.insert("морковка", 2, 9, False, "типо зайцы такое едят наверное")
    pzl.insert("огурец", 6, 9, True, "самый дорогой овощ сейчас в россии")
    pzl.insert("хуесос", 5, 11, False, "макан")
    pzl.insert("цыгане", 6, 14, False, "ненавижу, блять, [Х]!!!")
    pzl.insert("амонгас", 9, 9, True, "красный всегда убийца")
    pzl.insert("негр", 11, 13, True, "у него сосал Лимонов")
    pzl.log()
    print()
    with open('puzzlegen/puzzle.json', 'w') as f:
        json.dump(pzl.json(), f)



