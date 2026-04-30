import secrets # used for secure random numbers, better than random which is predictable
import string # gives ready-made character sets

def generate_strong_password(length=12):
    if length < 8:
        raise ValueError("Password lenght must be at least 8 characters!")
    
    password = [
        secrets.choice(string.ascii_lowercase), # this creates a list of  4 random chars (lower,upper,digits,symbol)
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.digits),
        secrets.choice("!@#$%^&*")
    ]

    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    password += [secrets.choice(alphabet) for _ in range(length - 4)] # run for size -4 and add random char from alphabet

    secrets.SystemRandom().shuffle(password)

    return ''.join(password) # converts list to string 


    