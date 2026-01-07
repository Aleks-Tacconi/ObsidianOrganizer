# Obsidian Organiser

A note-taking app designed to organize my Obsidian vault using a simple, consistent structure.
I organize my notes with two tags: module name and topic name. This app allows me to create.

- One web page per module
- One section per topic
- Each section automatically fetches and displays all notes related to that topic as a list of files. Within a section, I can also create notes which can contain the following information:
  - Lecture title
  - Lecture summary
  - Slide URL
  - Lecture recording URL

- All notes remain fully compatible with Obsidian: they are clickable and support normal wikilink navigation.

![./assets/1.png](./assets/1.png)
![./assets/2.png](./assets/2.png)
![./assets/3.png](./assets/3.png)

## Dependencies

- `npm`
- `python 3.12+`
- `poetry`
- `make`
- `mprocs`

## Tech Stack

### Frontend

- `vite` + `react`
- `MUI` as a component library
- `axios` for API calls
- `orval` for type generation

### Backend

- `python` + `django`
- `drf-spectacular` for Swagger-UI

## Setup and Usage Instructions

1. Clone the repository 

  ```sh
  git clone git@github.com:Aleks-Tacconi/ObsidianOrganizer.git
  ```

2. Navigate to the repository

  ```sh
  cd ./ObsidianOrganizer
  ```

3. Install dependencies

  ```sh
  make install
  ```

4. Run the program

  ```sh
  make run
  ```

## TODO / Upcoming Features

- Open file in obsidian button.
- Logging grades
- Rearranging modules
