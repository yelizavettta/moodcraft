const tg = window.Telegram.WebApp
tg.expand()

const habitList = document.getElementById("habitList")
const addHabitBtn = document.getElementById("addHabit")
const noteInput = document.getElementById("noteInput")
const saveNote = document.getElementById("saveNote")
const notes = document.getElementById("notes")

let habits = JSON.parse(localStorage.getItem("habits")) || []
let diary = JSON.parse(localStorage.getItem("diary")) || []

renderHabits()
renderNotes()

function renderHabits() {
  habitList.innerHTML = ""

  habits.forEach((h, i) => {
    const li = document.createElement("li")
    li.className = "habit"

    li.innerHTML = `
<span>${h}</span>
<input type="checkbox">
`

    habitList.appendChild(li)
  })
}

addHabitBtn.onclick = () => {
  const name = prompt("Название привычки")

  if (!name) return

  habits.push(name)

  localStorage.setItem("habits", JSON.stringify(habits))

  renderHabits()
}

saveNote.onclick = () => {
  const text = noteInput.value

  if (!text) return

  diary.push({
    date: new Date().toLocaleDateString(),
    text,
  })

  localStorage.setItem("diary", JSON.stringify(diary))

  noteInput.value = ""

  renderNotes()
}

function renderNotes() {
  notes.innerHTML = ""

  diary
    .slice()
    .reverse()
    .forEach((n) => {
      const div = document.createElement("div")

      div.className = "habit"

      div.innerHTML = `
<strong>${n.date}</strong>
<p>${n.text}</p>
`

      notes.appendChild(div)
    })
}

document.querySelectorAll(".mood").forEach((btn) => {
  btn.onclick = () => {
    const mood = btn.dataset.mood

    localStorage.setItem("mood", mood)

    alert("Настроение сохранено")
  }
})
