import React from "react";

interface CardProps {
  iconClass: string; // Font Awesome icon class
  title: string; // Title of the card
  value: string | number; // Main value to display
  description?: string; // Optional description
  percentageChange?: string; // Optional percentage change info
  isIncrease?: boolean; // Indicates if the change is positive or negative
}

const SummarySingleCard: React.FC<CardProps> = ({
  iconClass,
  title,
  value,
  description,
  percentageChange,
  isIncrease,
}) => {
  return (
    <div className="card__wrapper">
      <div className="flex items-center gap-[30px] maxSm:gap-5">
        <div className="card__icon">
          <span>
            <i className={iconClass}></i>
          </span>
        </div>
        <div className="card__title-wrap">
          <h6 className="card__sub-title mb-[10px]">{title}</h6>
          <div className="flex flex-wrap items-end gap-[10px]">
            <h3 className="card__title mb-0">{value}</h3>
            {description && (
              <span className="card__desc style_two">
                {percentageChange && (
                  <span
                    className={`price-${isIncrease ? "increase" : "decrease"}`}
                  >
                    <i
                      className={`fa-light ${
                        isIncrease ? "fa-arrow-up" : "fa-arrow-down"
                      }`}
                    ></i>{" "}
                    {percentageChange}
                  </span>
                )}{" "}
                {description}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummarySingleCard;
