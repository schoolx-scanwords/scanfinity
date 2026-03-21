import json
import random

class Puzzle():

    def __init__(self, size):
        self.grid = [["0" for _ in range(size)] for _ in range(size)]
        self.words = []
        self.word_strings = []
        self.nodes = []
        self.c_nodes = []

    # I/O - inserting and fetching data and what not

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

    def insert_word(self, word, x, y, direction=bool, riddle="no_riddle"): # down --> True, right --> False 
        puzzlet = f"#{word}#" # add hashes to mark prohibited intersections
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
            
            wrd_id = len(self.words)
            self.words.append({ # storing word-data
                "id": wrd_id,
                "word": word,
                "riddle": riddle,
                "coords": [x, y, len(word)],
                "direction": "down" if direction else "right"
                })

            self.word_strings.append(word)

            self.get_nodes(self.words[wrd_id])

        else:
            print("conflict has been detected") # надо детектить конфликты наверное
            return

    # handling nodes and shit - for the generation algorhythm
    def get_adj_cells(self, x, y):
        return [
            self.grid[y][x-1] if x > 0 else None, # left
            self.grid[y][x+1] if x < len(self.grid[0]) - 1 else None, # right
            self.grid[y-1][x] if y > 0 else None, # up
            self.grid[y+1][x] if y < len(self.grid) - 1 else None # down
        ]
    
    def get_word_coords(self, word):
        coords = []
        if word["direction"] == "down":
            for y in range(word["coords"][1] + 1, word["coords"][1] + len(word["word"]) + 1):
                coords.append((word["coords"][0], y))
        else:
            for x in range(word["coords"][0] + 1, word["coords"][0] + len(word["word"]) + 1):
                coords.append((x, word["coords"][1]))
        return coords
    

    def get_node_coords(self, node, direction):
        coords = []
        if direction == "right": # THE FUCKING DIRECTION IS FUCKING REVERSED HERE I SPENT 2 HOURS DEBUGGING THIS SHIT I AM GOING TO FUCKING KILL MYSELF
            for y in range(node[1], node[1] + node[2]):
                coords.append((node[0], y))
        else:
            for x in range(node[0], node[0] + node[2]):
                coords.append((x, node[1]))
        return coords   

    
    def get_adj_words(self, inp_word):
        adj_words = []
        if inp_word["direction"] == "down":
            for word in self.words:
                if word["direction"] == "down" and (word["coords"][0] == inp_word["coords"][0] - 1 or word["coords"][0] == inp_word["coords"][0] + 1):
                    if not set([coord[1] for coord in self.get_word_coords(inp_word)]).isdisjoint([coord[1] for coord in self.get_word_coords(word)]):
                        adj_words.append(word)
        else:
            for word in self.words:
                if word["direction"] == "right" and (word["coords"][1] == inp_word["coords"][1] - 1 or word["coords"][1] == inp_word["coords"][1] + 1): #parallel
                    if not set([coord[0] for coord in self.get_word_coords(inp_word)]).isdisjoint([coord[0] for coord in self.get_word_coords(word)]): #check if words are ajecent
                        adj_words.append(word)
        
        return adj_words


    def get_intersections(self, word):
        intersections = []
        if word["direction"] == "down":
            for i in range(word["coords"][1] + 1, word["coords"][1] + len(word["word"]) + 1):
                if self.grid[i][word["coords"][0]].isalpha():
                    intersections.append((word["coords"][0], i))
        else:
            for i in range(word["coords"][0] + 1, word["coords"][0] + len(word["word"]) + 1):
                if self.grid[word["coords"][1]][i].isalpha():
                    intersections.append((i, word["coords"][1]))
        
        return intersections
    
    def get_c_node_from_line(self, line, start):
        l, s, stop = line, start, '#%'
        if s < 0 or s >= len(l) or l[s] in stop:
            return '', -1, 0  # Return empty string, invalid index, zero length

        n, left, right = len(l), s, s
        while left >= 0 and l[left] not in stop:
            left -= 1
        while right < n and l[right] not in stop:
            right += 1

        result = ''.join(l[left+1:right])
        return [result, left+1, right - (left+1)]
    
    def get_nodes(self, word):
        if word["direction"] == "down":
            all_coords = [(word["coords"][0], i) for i in range(word["coords"][1] + 1, word["coords"][1] + len(word["word"]) + 1)] # only iterating over letters
        else:
            all_coords = [(i, word["coords"][1]) for i in range(word["coords"][0] + 1, word["coords"][0] + len(word["word"]) + 1)]
        
        new_nodes = []
        excluded = []
        for coord in all_coords:
            adj = self.get_adj_cells(coord[0], coord[1])
            
            # counting adjacent letters
            letters = 0
            for cell in adj:
                if cell.isalpha():
                    letters += 1
            
            # adding new single-letter node
            if "%" in [adj[0], adj[1]] or "%" in [adj[2], adj[3]]:
                    new_nodes.append((coord[0], coord[1]))
            else: 
                excluded.append((coord[0], coord[1]))

        # remove resolved nodes
        try:
            for node in excluded:
                self.nodes.remove(node)
        except:
            pass
  
        extended_nodes = {} 
        for coords in new_nodes: # getting the lines to fetch the nodes from
            if word["direction"] == "down":
                extended_nodes[coords] = [[self.grid[coords[1]][x] for x in range(coords[0] - 1, -1, -1)][::-1] + [self.grid[coords[1]][coords[0]]]  + [self.grid[coords[1]][x] for x in range(coords[0] + 1, len(self.grid))], "down"]
            else:
                extended_nodes[coords] = [[self.grid[y][coords[0]] for y in range(coords[1] - 1, -1, -1)][::-1] + [self.grid[coords[1]][coords[0]]]  + [self.grid[y][coords[0]] for y in range(coords[1] + 1, len(self.grid))], "right"]
                
        new_c_nodes = []
        for line in extended_nodes.keys():
            if extended_nodes[line][1] == "down":
                start = line[0]
                direction = "down"
            else:
                start = line[1]
                direction = "right"
            

            new_node = self.get_c_node_from_line(extended_nodes[line][0], start)
            if new_node[0] in self.word_strings: # discard node if it's a word
                continue
            if new_node[2] == 1:
                self.nodes.append(line)
            else:
                if direction == "down":
                    node_data = (new_node[1], line[1], new_node[2], direction)
                else:
                    node_data = (line[0], new_node[1], new_node[2], direction)
                self.c_nodes.append(node_data) 
                new_c_nodes.append(node_data)

        for node in new_c_nodes: # removing redundunt nodes (singular that are now part of c_node)
            new_nodes = self.get_node_coords(node[0:3], node[3])
            self.nodes = [existing_node for existing_node in self.nodes if existing_node not in new_nodes]

        
        return self.nodes, self.c_nodes

    def log(self):
        for row in self.grid:
            print(list(''.join(row).replace("0", "_").replace("#", "_").replace("%", "_")))

    def get_json(self):

        blank_grid = []
        for line in self.grid:
            blank_grid.append(["L" if char.isalpha() else char for char in line]) # blank grid will be parsed by client to avoid cheating

        return {"id": random.randint(0, 10000), "blank": blank_grid, "grid": self.grid, "words": self.words}


if __name__ == "__main__":
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

    from database.game import insert_puzzle
    from models import Puzzle as PZL
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

    insert_puzzle(pzl_obj)




