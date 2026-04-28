"use client";
import Breadcrumb from "@/common/Breadcrumb/breadcrumb";
import React, { useState } from "react";
import SearchTabOneItem from "./SearchTabOneItem";
import { Tab, Tabs } from "@mui/material";
import SearchTabTwoItems from "./SearchTabTwoItems";
import SearchTabThreeItems from "./SearchTabThreeItems";
import SearchTabFourItems from "./SearchTabFourItems";
import SearchTabFiveItems from "./SearchTabFiveItems";

const SearchMainArea = () => {
  const [value, setValue] = useState<number>(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };
  return (
    <>
      {/* -- App side area start -- */}
      <div className="app__slide-wrapper">
        <Breadcrumb breadTitle="Search" subTitle="Home" />

        <div className="grid grid-cols-12">
          <div className="col-span-12">
            <div className="card_-_wrapper">
              <div className="main__search mb-[20px]">
                <form action="#">
                  <div className="input-group search-input-fix">
                    <input type="text" className="form-control" />
                    <button className="btn btn-primary" type="button">
                      Search
                    </button>
                  </div>
                </form>
              </div>
              <div className="search__result-wrapper">
                <div className="search-primary-tabs-wrapper">
                  {/* Tabs */}
                  <Tabs value={value} onChange={handleChange}>
                    <Tab label="All" />
                    <Tab label="Employee" />
                    <Tab label="Project" />
                    <Tab label="Client" />
                    <Tab label="Media" />
                  </Tabs>
                  <div className="tab-content">
                    <div hidden={value !== 0}>
                      {value === 0 && <SearchTabOneItem />}
                    </div>
                    <div hidden={value !== 1}>
                      {value === 1 && <SearchTabTwoItems />}
                    </div>
                    <div hidden={value !== 2}>
                      {value === 2 && <SearchTabThreeItems />}
                    </div>
                    <div hidden={value !== 3}>
                      {value === 3 && (
                        <>
                          <SearchTabFourItems />
                        </>
                      )}
                    </div>
                    <div hidden={value !== 4}>
                      {value === 4 && <SearchTabFiveItems />}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* -- App side area end -- */}
    </>
  );
};

export default SearchMainArea;
