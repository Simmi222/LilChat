# Python virtual environment banao
python -m venv venv

# Virtual environment activate karo
# Windows
venv\Scripts\activate

# Django install karo
pip install django djangorestframework django-cors-headers python-dotenv

# Django project create karo
django-admin startproject backend .

# App create karo
python manage.py startapp users
python manage.py startapp posts
python manage.py startapp messages
python manage.py startapp stories
python manage.py startapp connections


# Run Backend
venv\Scripts\activate

python manage.py runserver