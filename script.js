const app = document.querySelector(".app")

const form = document.querySelector("#sorteioForm")
const inputDe = document.querySelector("#numeroDe")
const inputAte = document.querySelector("#numeroAte")

const resultadoEl = document.querySelector("#resultado")
const mensagemEl = document.querySelector("#mensagem")

const logoBtn = document.querySelector("#logoBtn")
const copyBtn = document.querySelector("#copyBtn")
const resetBtn = document.querySelector("#resetBtn")

const historicoEl = document.querySelector("#historico")
const clearHistoryBtn = document.querySelector("#clearHistoryBtn")
const presets = document.querySelector(".presets")

const STORAGE_HISTORY_KEY = "projetoRandom:history:v1"
const STORAGE_RANGE_KEY = "projetoRandom:range:v1"
const MAX_HISTORY = 12

const prefersReducedMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches

let currentResult = null
let history = []
let rollIntervalId = null
let rollTimeoutId = null
let messageTimeoutId = null

function loadJson(key, fallback) {
    try {
        const raw = localStorage.getItem(key)
        if (!raw) return fallback
        return JSON.parse(raw)
    } catch {
        return fallback
    }
}

function saveJson(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value))
    } catch {
        // ignore
    }
}

function setMessage(text, { error = false, timeoutMs = 0 } = {}) {
    mensagemEl.textContent = text
    mensagemEl.classList.toggle("is-error", error)

    if (messageTimeoutId) window.clearTimeout(messageTimeoutId)
    messageTimeoutId = null

    if (timeoutMs > 0 && text) {
        messageTimeoutId = window.setTimeout(() => {
            mensagemEl.textContent = ""
            mensagemEl.classList.remove("is-error")
            messageTimeoutId = null
        }, timeoutMs)
    }
}

function setErrorState(isError) {
    inputDe.classList.toggle("is-error", isError)
    inputAte.classList.toggle("is-error", isError)
}

function getRangeFromInputs() {
    const rawMin = inputDe.value.trim()
    const rawMax = inputAte.value.trim()

    const missingMin = !rawMin
    const missingMax = !rawMax

    if (missingMin || missingMax) {
        inputDe.classList.toggle("is-error", missingMin)
        inputAte.classList.toggle("is-error", missingMax)
        setMessage("Preencha os dois campos para sortear.", { error: true, timeoutMs: 2600 })
        return null
    }

    const minNum = Number(rawMin)
    const maxNum = Number(rawMax)

    if (!Number.isFinite(minNum) || !Number.isFinite(maxNum)) {
        setErrorState(true)
        setMessage("Use apenas números válidos.", { error: true, timeoutMs: 2600 })
        return null
    }

    let min = Math.ceil(minNum)
    let max = Math.floor(maxNum)
    let swapped = false

    if (min > max) {
        swapped = true
        ;[min, max] = [max, min]
    }

    return { min, max, swapped, adjusted: min !== minNum || max !== maxNum }
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

function cancelRollAnimation() {
    if (rollIntervalId) window.clearInterval(rollIntervalId)
    if (rollTimeoutId) window.clearTimeout(rollTimeoutId)
    rollIntervalId = null
    rollTimeoutId = null
    app.classList.remove("is-rolling")
}

function setResult(value) {
    currentResult = value
    resultadoEl.textContent = value === null ? "—" : String(value)
    copyBtn.disabled = value === null
}

async function copyText(text) {
    const value = String(text)

    if (navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(value)
            return true
        } catch {
            // fallback to execCommand
        }
    }

    const textarea = document.createElement("textarea")
    textarea.value = value
    textarea.setAttribute("readonly", "true")
    textarea.style.position = "fixed"
    textarea.style.left = "-9999px"
    textarea.style.top = "-9999px"
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand("copy")
    document.body.removeChild(textarea)
    return ok
}

function pushHistory(value) {
    history.unshift(value)
    history = history.slice(0, MAX_HISTORY)
    saveJson(STORAGE_HISTORY_KEY, history)
    renderHistory()
}

function renderHistory() {
    historicoEl.innerHTML = ""

    history.forEach((value) => {
        const li = document.createElement("li")
        const btn = document.createElement("button")
        btn.type = "button"
        btn.className = "historyItem"
        btn.textContent = String(value)
        btn.setAttribute("aria-label", `Copiar ${value}`)
        btn.addEventListener("click", async () => {
            try {
                const ok = await copyText(value)
                if (!ok) throw new Error("copy_failed")
                setMessage("Número do histórico copiado!", { timeoutMs: 1400 })
            } catch {
                setMessage("Não foi possível copiar.", { error: true, timeoutMs: 2000 })
            }
        })
        li.appendChild(btn)
        historicoEl.appendChild(li)
    })

    
    clearHistoryBtn.disabled = history.length === 0
}

function loadInitialState() {
    const savedHistory = loadJson(STORAGE_HISTORY_KEY, [])
    if (Array.isArray(savedHistory)) {
        history = savedHistory.filter((n) => typeof n === "number" && Number.isFinite(n))
        history = history.slice(0, MAX_HISTORY)
    }
    renderHistory()

    const savedRange = loadJson(STORAGE_RANGE_KEY, null)
    if (savedRange && typeof savedRange === "object") {
        const { min, max } = savedRange
        if (Number.isFinite(min) && Number.isFinite(max)) {
            inputDe.value = String(min)
            inputAte.value = String(max)
        }
    }
}

function roll() {
    cancelRollAnimation()
    setErrorState(false)

    const range = getRangeFromInputs()
    if (!range) return

    const { min, max, swapped, adjusted } = range
    saveJson(STORAGE_RANGE_KEY, { min, max })

    const finalValue = randomInt(min, max)

    if (swapped && adjusted) {
        setMessage(`Ajustei o intervalo para números inteiros: ${min} até ${max}.`, {
            timeoutMs: 2600,
        })
    } else if (swapped) {
        setMessage(`Intervalo invertido — usei ${min} até ${max}.`, { timeoutMs: 2400 })
    } else if (adjusted) {
        setMessage(`Ajustei para números inteiros: ${min} até ${max}.`, { timeoutMs: 2400 })
    } else {
        setMessage("")
    }

    if (prefersReducedMotion) {
        setResult(finalValue)
        pushHistory(finalValue)
        return
    }

    app.classList.add("is-rolling")
    rollIntervalId = window.setInterval(() => {
        resultadoEl.textContent = String(randomInt(min, max))
    }, 40)

    rollTimeoutId = window.setTimeout(() => {
        cancelRollAnimation()
        setResult(finalValue)
        pushHistory(finalValue)
    }, 460)
}

form.addEventListener("submit", (event) => {
    event.preventDefault()
    roll()
})

presets.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-min][data-max]")
    if (!btn) return

    inputDe.value = btn.dataset.min ?? ""
    inputAte.value = btn.dataset.max ?? ""
    roll()
})

logoBtn.addEventListener("click", () => {
    const isMinEmpty = !inputDe.value.trim()
    const isMaxEmpty = !inputAte.value.trim()

    if (isMinEmpty && isMaxEmpty) {
        inputDe.value = "1"
        inputAte.value = "100"
        setMessage("Intervalo padrão: 1 até 100.", { timeoutMs: 2000 })
    }

    roll()
})

copyBtn.addEventListener("click", async () => {
    if (currentResult === null) return

    const originalText = copyBtn.textContent
    copyBtn.disabled = true

    try {
        const ok = await copyText(currentResult)
        if (!ok) throw new Error("copy_failed")
        copyBtn.textContent = "Copiado!"
        setMessage("Copiado para a área de transferência.", { timeoutMs: 1600 })
    } catch {
        setMessage("Não foi possível copiar.", { error: true, timeoutMs: 2200 })
    } finally {
        window.setTimeout(() => {
            copyBtn.textContent = originalText
            copyBtn.disabled = currentResult === null
        }, 900)
    }
})

resetBtn.addEventListener("click", () => {
    cancelRollAnimation()
    setErrorState(false)
    setMessage("")
    setResult(null)
    inputDe.focus()
})

clearHistoryBtn.addEventListener("click", () => {
    history = []
    saveJson(STORAGE_HISTORY_KEY, history)
    renderHistory()
    setMessage("Histórico limpo.", { timeoutMs: 1400 })
})

loadInitialState()
