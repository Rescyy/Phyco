import { MultipleEventHandler } from "../../Core/Singletons/MultipleEventHandler";

type FunctionalButtonProps = {
    onClick?: React.MouseEventHandler<HTMLButtonElement>,
    show?: boolean,
    text?: string,
    tooltip?: string,
    disabled?: boolean,
}

export default function FunctionalButton({ onClick, show, text, tooltip, disabled }: FunctionalButtonProps) {
    if (show === undefined) show = true;
    return <>
        {show ? <button
            className={`text-gray-800 px-2 py-1 font-normal border  rounded select-none ${disabled ? "bg-blue-200 border-blue-200" : "bg-blue-300 hover:bg-blue-400 border-blue-700"}`}
            onClick={(e) => {
                try {
                    if (onClick !== undefined) {
                        onClick(e);
                    }
                } finally {
                    MultipleEventHandler.setEvent("functionalButtonPressed");
                }
            }}
            title={tooltip} disabled={disabled}>
            {text}
        </button> : null}
    </>;
}