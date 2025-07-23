from typing_extensions import override


class AsciiSprite:
    ''' todo: add color '''
    def __init__(self, char: str):
        self.char = char

class Entity:
    _next_id = 0

    def __init__(self, x: int, y: int):
        self.x = x
        self.y = y

        self.id = Entity._next_id
        Entity._next_id += 1
         
    def render(self):
        return AsciiSprite('X')

    def tick(self):
        pass

class Grass(Entity):
    def __init__(self, x: int, y: int):
        super().__init__(x, y)

    @override
    def render(self):
        return AsciiSprite('.')

class Spectator(Entity):
    def __init__(self):
        super().__init__(0,0)

    @override
    def render(self):
        return AsciiSprite('O')


class WorldState:
    ''' the global (saveable/loadable) world state '''
    def __init__(self):
        self.tick = 0
        self.entities = []
        self.view_entity = Spectator()
        self.entities.append(self.view_entity)

def generate_new_world() -> WorldState:
    s = WorldState()
    s.entities.append(Grass(10,10))
    return s 

def init_world_state(save_path) -> WorldState:
    return generate_new_world()

def get_input():
    return None

def process_input(a,b):
    pass

def main(kwargs):
    save_path = kwargs.get('save_path', None)
    world_state = init_world_state(save_path)
    
    exit_flag = False
    while not exit_flag:

        render_view(

        user_input = get_input()
        process_input(world_state, user_input)











