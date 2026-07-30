# run the app 
you be here in terminal 
```bash
big brother\src\app
```
if not the just 
```bash
cd BIG_BROTHER-\src\app
```
## setting enviroment
```bash
python -m venv .venv
```
## run this first in your terminal if your using powershell
```bash
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
```
(This safely changes the rule only for this single open terminal window, meaning it won't permanently change your system's global security levels)
then this 
```bash
.\.venv\Scripts\Activate.ps1    
```
to enter vertual envroment 

## just run this if your using Cmd
```bash
.venv\Scripts\activate.bat
```

## to start python app
run this in you treminal 
```bash
 .\.venv\Scripts\python.exe main_app.py
```
## to run in your webcam
select 0 for defult or select 1...n 

## how quit
press q for exit if everything is right press ctrl+^c to force exit
# how exit the python enviroment
type ```deactivate``` in terminal 

# building the .exe
```bash
.\.venv\Scripts\python.exe -m PyInstaller build.spec --noconfirm
```