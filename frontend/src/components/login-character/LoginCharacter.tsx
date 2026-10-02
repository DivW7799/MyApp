import "./LoginCharacter.css";

export type LoginCharacterState =
  | "idle"
  | "username"
  | "password"
  | "password-visible"
  | "error"
  | "submitting";

type LoginCharacterProps = {
  state: LoginCharacterState;
};

export function LoginCharacter({ state }: LoginCharacterProps) {
  return (
    <div
      className={`login-character login-character--${state}`}
      aria-hidden="true"
    >
      <svg
        className="login-character__svg"
        viewBox="0 0 420 420"
        xmlns="http://www.w3.org/2000/svg"
      >
        <ellipse
          className="login-character__shadow"
          cx="210"
          cy="372"
          rx="92"
          ry="18"
        />

        <g className="login-character__tail">
          <path
            d="M312 282C363 271 382 224 360 187C347 165 321 161 305 177C331 183 341 204 329 219C318 234 298 239 276 239"
            fill="#F49A44"
            stroke="#B95E1B"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M351 191C364 196 369 209 366 222C362 238 350 249 335 254"
            fill="none"
            stroke="#FFE6C2"
            strokeWidth="13"
            strokeLinecap="round"
          />
        </g>

        <g className="login-character__body">
          <ellipse
            cx="210"
            cy="291"
            rx="78"
            ry="92"
            fill="#F49A44"
            stroke="#B95E1B"
            strokeWidth="8"
          />

          <ellipse cx="210" cy="320" rx="48" ry="50" fill="#FFE6C2" />

          <ellipse cx="156" cy="341" rx="19" ry="30" fill="#D96F21" />

          <ellipse cx="264" cy="341" rx="19" ry="30" fill="#D96F21" />
        </g>

        <g className="login-character__head">
          <path
            d="M137 108L125 46L178 88"
            fill="#F49A44"
            stroke="#B95E1B"
            strokeWidth="8"
            strokeLinejoin="round"
          />

          <path
            d="M283 108L295 46L242 88"
            fill="#F49A44"
            stroke="#B95E1B"
            strokeWidth="8"
            strokeLinejoin="round"
          />

          <path d="M144 91L140 66L165 87" fill="#FFCFD8" />

          <path d="M276 91L280 66L255 87" fill="#FFCFD8" />

          <ellipse
            cx="210"
            cy="150"
            rx="82"
            ry="79"
            fill="#F49A44"
            stroke="#B95E1B"
            strokeWidth="8"
          />

          <path
            d="M167 185C181 202 239 202 253 185C244 224 176 224 167 185Z"
            fill="#FFE6C2"
          />

          <ellipse
            className="login-character__nose"
            cx="210"
            cy="176"
            rx="11"
            ry="8"
            fill="#55301F"
          />

          <path
            className="login-character__mouth"
            d="M210 184C210 193 200 198 193 196M210 184C210 193 220 198 227 196"
            fill="none"
            stroke="#55301F"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </g>

        <g className="login-character__eyes">
          <ellipse cx="176" cy="151" rx="22" ry="25" fill="#FFFFFF" />
          <ellipse cx="244" cy="151" rx="22" ry="25" fill="#FFFFFF" />

          <circle
            className="login-character__pupil login-character__pupil--left"
            cx="178"
            cy="153"
            r="9"
            fill="#172033"
          />

          <circle
            className="login-character__pupil login-character__pupil--right"
            cx="242"
            cy="153"
            r="9"
            fill="#172033"
          />

          <circle cx="181" cy="149" r="3" fill="#FFFFFF" />
          <circle cx="245" cy="149" r="3" fill="#FFFFFF" />
        </g>

        <g className="login-character__glasses">
          <rect
            x="148"
            y="127"
            width="56"
            height="43"
            rx="13"
            fill="none"
            stroke="#172033"
            strokeWidth="8"
          />

          <rect
            x="216"
            y="127"
            width="56"
            height="43"
            rx="13"
            fill="none"
            stroke="#172033"
            strokeWidth="8"
          />

          <path
            d="M204 140H216"
            stroke="#172033"
            strokeWidth="8"
            strokeLinecap="round"
          />
        </g>

        <g className="login-character__password-paws">
          <ellipse
            cx="168"
            cy="146"
            rx="27"
            ry="20"
            fill="#F49A44"
            stroke="#B95E1B"
            strokeWidth="7"
          />
          <ellipse
            cx="252"
            cy="146"
            rx="27"
            ry="20"
            fill="#F49A44"
            stroke="#B95E1B"
            strokeWidth="7"
          />

          <circle cx="158" cy="137" r="4" fill="#D96F21" />
          <circle cx="168" cy="132" r="4" fill="#D96F21" />
          <circle cx="178" cy="137" r="4" fill="#D96F21" />

          <circle cx="242" cy="137" r="4" fill="#D96F21" />
          <circle cx="252" cy="132" r="4" fill="#D96F21" />
          <circle cx="262" cy="137" r="4" fill="#D96F21" />
        </g>

        <g className="login-character__typing">
          <ellipse
            cx="175"
            cy="258"
            rx="27"
            ry="20"
            fill="#F49A44"
            stroke="#B95E1B"
            strokeWidth="7"
          />

          <ellipse
            cx="245"
            cy="258"
            rx="27"
            ry="20"
            fill="#F49A44"
            stroke="#B95E1B"
            strokeWidth="7"
          />

          <circle cx="165" cy="249" r="4" fill="#D96F21" />
          <circle cx="175" cy="245" r="4" fill="#D96F21" />
          <circle cx="185" cy="249" r="4" fill="#D96F21" />

          <circle cx="235" cy="249" r="4" fill="#D96F21" />
          <circle cx="245" cy="245" r="4" fill="#D96F21" />
          <circle cx="255" cy="249" r="4" fill="#D96F21" />
        </g>

        <g className="login-character__error-mark">
          <circle
            cx="330"
            cy="94"
            r="27"
            fill="#FFFFFF"
            stroke="#E05252"
            strokeWidth="7"
          />

          <path
            d="M319 83L341 105M341 83L319 105"
            stroke="#E05252"
            strokeWidth="7"
            strokeLinecap="round"
          />
        </g>

        <g className="login-character__loading">
          <circle cx="178" cy="262" r="6" />
          <circle cx="210" cy="262" r="6" />
          <circle cx="242" cy="262" r="6" />
        </g>

        <g className="login-character__sparkles">
          <path d="M85 126L90 141L105 146L90 151L85 166L80 151L65 146L80 141Z" />
          <path d="M330 293L334 304L345 308L334 312L330 323L326 312L315 308L326 304Z" />
          <path d="M310 74L314 84L324 88L314 92L310 102L306 92L296 88L306 84Z" />
        </g>
      </svg>

      <div className="login-character__caption">
        <span className="login-character__caption-default">
          Your friendly security fox
        </span>

        <span className="login-character__caption-password">
          Eyes closed. Password safe.
        </span>

        <span className="login-character__caption-password-visible">
          Okay, I can see it now.
        </span>

        <span className="login-character__caption-error">
          Hmm… something went wrong.
        </span>

        <span className="login-character__caption-submitting">
          Checking your credentials…
        </span>
      </div>
    </div>
  );
}
