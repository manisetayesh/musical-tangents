const vis_header_1 = document.getElementById('vis-header-1')
const vinyl_header = document.getElementById("vinyl-header")
function artist() {
    console.log("artist");
    vis_header_1.textContent = "Which features line up with popularity?"
    vinyl_header.textContent = "The most popular genres per year"
}
function explorer() {
    console.log("explorer");
    vis_header_1.textContent = "Which features line up with standing out?"
    vinyl_header.textContent = "The most niche genres per year"

}
