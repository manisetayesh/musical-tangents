const vis_header_1 = document.getElementById('vis-header-1')
const vis_header_2 = document.getElementById('vis-header-2')
function artist() {
    console.log("artist");
    vis_header_1.textContent = "Which features line up with popularity?"
    vis_header_2.textContent = "Given song attributes, can we guess a hit from its numbers?"
}
function explorer() {
    console.log("explorer");
    vis_header_1.textContent = "Which features line up with standing out?"
    vis_header_2.textContent = "Let's find song attributes characteristic of niche songs"
}
