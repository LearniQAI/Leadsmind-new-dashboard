"use client"

import { useState } from "react";
import CountUp from "react-countup";
import { InView } from "react-intersection-observer";

interface CountUpContentProps {
  number: number;
  text?: string;
  add_style?: boolean;
}

const CountUpContent: React.FC<CountUpContentProps> = ({
  number,
  text,
  add_style = true,
}) => {
  const [focus, setFocus] = useState(false);

  const visibleChangeHandler = (isVisible: boolean) => {
    if (isVisible && !focus) {
      setFocus(true);
    }
  };

  return (
    <CountUp start={focus ? 0 : number} end={number} duration={5}>
      {({ countUpRef }) => (
        <div
          className={`${
            add_style ? "" : ""
          }`}
        >
          <span className="" ref={countUpRef} />
          <InView as="span" onChange={visibleChangeHandler}>
            {text && <span className="">{text}</span>}
          </InView>
        </div>
      )}
    </CountUp>
  );
};

export default CountUpContent;


// uses example : <span className="counter"><CountUpContent number={3560} text="+" /> </span>
