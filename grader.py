import ast
import json
import math


def run_student(source, inputs):
    output, calls, ops, transcript = [], [], [], []
    variables = {}
    position = 0
    error = ''
    written = 0
    def student_input(prompt=''):
        nonlocal position
        calls.append('input')
        if position >= len(inputs):
            raise ValueError('There are more input() calls than this question needs.')
        value = inputs[position]
        position += 1
        transcript.append(str(prompt) + value + '\n')
        return value
    def student_print(*values, sep=' ', end='\n'):
        nonlocal written
        calls.append('print')
        text = sep.join(str(v) for v in values) + end
        written += len(text)
        if written > 10000:
            raise ValueError('Keep your output short for this question.')
        output.append(text)
        transcript.append(text)
    def student_int(*args, **kwargs):
        calls.append('int')
        return int(*args, **kwargs)
    def student_float(*args, **kwargs):
        calls.append('float')
        return float(*args, **kwargs)
    allowed = (ast.Module, ast.Assign, ast.AugAssign, ast.Expr, ast.Name,
               ast.Constant, ast.Call, ast.BinOp, ast.UnaryOp, ast.Load,
               ast.Store, ast.Add, ast.Sub, ast.Mult, ast.Div, ast.UAdd,
               ast.USub, ast.Tuple, ast.JoinedStr, ast.FormattedValue, ast.keyword)
    operators = {ast.Add: '+', ast.Sub: '-', ast.Mult: '*', ast.Div: '/'}
    safe = {'print': student_print, 'input': student_input,
            'int': student_int, 'float': student_float}
    environment = {'__builtins__': safe}
    try:
        if len(source) > 6000:
            raise ValueError('Keep your answer under 6,000 characters.')
        tree = ast.parse(source, filename='answer.py')
        for node in ast.walk(tree):
            if not isinstance(node, allowed):
                raise ValueError('Use only basic assignments, print(), input(), int(), float(), and + - * /. No conditions, loops or functions.')
            if isinstance(node, ast.Name):
                if node.id.startswith('__') or (isinstance(node.ctx, ast.Store) and node.id in safe):
                    raise ValueError('Choose a variable name that does not replace a Python command.')
            if isinstance(node, ast.Call):
                if not isinstance(node.func, ast.Name) or node.func.id not in safe:
                    raise ValueError('Use only print(), input(), int() and float().')
            if isinstance(node, ast.Constant):
                if type(node.value) not in (str, int, float):
                    raise ValueError('Use text and numbers in this activity.')
            if isinstance(node, ast.FormattedValue) and node.conversion not in (-1, 115):
                raise ValueError('Use simple text or numeric formatting in print().')
            if type(node) in operators:
                ops.append(operators[type(node)])
        exec(compile(tree, 'answer.py', 'exec'), environment)
    except Exception as exc:
        line = getattr(exc, 'lineno', None)
        if line is None:
            tb = exc.__traceback__
            while tb:
                if tb.tb_frame.f_code.co_filename == 'answer.py':
                    line = tb.tb_lineno
                tb = tb.tb_next
        error = (f'Line {line}: ' if line else '') + str(exc)
    for key, value in environment.items():
        if not key.startswith('__') and type(value) in (int, float, str):
            if type(value) == float and not math.isfinite(value):
                continue
            variables[key] = {'v': value, 't': type(value).__name__}
    return {'vars': variables, 'output': ''.join(output).splitlines(),
            'calls': calls, 'ops': ops, 'error': error, 'inputCount': position,
            'transcript': ''.join(transcript)}


def run_batch(payload):
    data = json.loads(payload)
    return json.dumps([run_student(data['source'], inputs) for inputs in data['inputs']])
