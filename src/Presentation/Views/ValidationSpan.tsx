export default function ValidationSpan({message}: {message: string}) {
    return <span className={`text-sm ${message ? "text-red-500" : "text-transparent"} select-none`}>{message || "placeholder"}</span>
}