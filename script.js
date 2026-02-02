
const botao = document.querySelector("button")
const img = document.querySelector("img")


botao.addEventListener("click", function() {
    const numero = document.querySelector ("h2")
    const numeroDe = Math.ceil(document.querySelector("#numeroDe").value)
    const numeroAte =  Math.floor(document.querySelector("#numeroAte").value)
    const numeroRandom = Math.floor(Math.random() * (numeroDe - numeroAte) + numeroAte);

    numero.innerHTML = numeroRandom

    if (numeroDe > numeroAte) {
        numero.innerHTML = "Indefinido"
    } else if(numeroDe == "") {
        numero.innerHTML = "Indefinido"
    } 
})

img.addEventListener("click", function() {
    location.reload(true)
})