import React from "react";
import Breadcrumb from "@/common/Breadcrumb/breadcrumb";
import Link from "next/link";

const GridMainArea = () => {
  return (
    <>
      {/* -- App side area start -- */}
      <div className="app__slide-wrapper">
        <Breadcrumb breadTitle="Grid" subTitle="Ui Elements" />
        <div className="grid grid-cols-12">
          <div className="col-span-12">
            <div className="card__wrapper">
              <div className="card__title-wrap mb-5">
                <h5 className="card__heading-title mb-2.5">Grid Options</h5>
                <p>
                  Tailwind grid allows building equal height flexible blocks
                  easily
                </p>
              </div>
              <div className="table-responsive">
                <table className="table table-bordered table-striped w-full">
                  <thead>
                    <tr>
                      <th scope="col"></th>
                      <th scope="col">
                        xs
                        <br />
                        <span className="fw-normal">&lt;576px</span>
                      </th>
                      <th scope="col">
                        sm
                        <br />
                        <span className="fw-normal">≥576px</span>
                      </th>
                      <th scope="col">
                        md
                        <br />
                        <span className="fw-normal">≥768px</span>
                      </th>
                      <th scope="col">
                        lg
                        <br />
                        <span className="fw-normal">≥992px</span>
                      </th>
                      <th scope="col">
                        xl
                        <br />
                        <span className="fw-normal">≥1200px</span>
                      </th>
                      <th scope="col">
                        xxl
                        <br />
                        <span className="fw-normal">≥1400px</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th className="text-nowrap" scope="row">
                        Container <code className="fw-normal">max-width</code>
                      </th>
                      <td>None (auto)</td>
                      <td>540px</td>
                      <td>720px</td>
                      <td>960px</td>
                      <td>1140px</td>
                      <td>1320px</td>
                    </tr>
                    <tr>
                      <th className="text-nowrap" scope="row">
                        Class prefix
                      </th>
                      <td>
                        <code>col-span-12</code>
                      </td>
                      <td>
                        <code>sm:col-span-12</code>
                      </td>
                      <td>
                        <code>md:col-span-12</code>
                      </td>
                      <td>
                        <code>lg:col-span-12</code>
                      </td>
                      <td>
                        <code>xl:col-span-12</code>
                      </td>
                      <td>
                        <code>xxl:col-span-12</code>
                      </td>
                    </tr>
                    <tr>
                      <th className="text-nowrap" scope="row">
                        # of columns
                      </th>
                      <td colSpan={6}>12</td>
                    </tr>
                    <tr>
                      <th className="text-nowrap" scope="row">
                        Gutter width
                      </th>
                      <td colSpan={6}>1.5rem (.75rem on left and right)</td>
                    </tr>
                    <tr>
                      <th className="text-nowrap" scope="row">
                        Custom gutters
                      </th>
                      <td colSpan={6}>
                        <Link href="https://getbootstrap.com/docs/5.3/layout/gutters/">
                          Yes
                        </Link>
                      </td>
                    </tr>
                    <tr>
                      <th className="text-nowrap" scope="row">
                        Nestable
                      </th>
                      <td colSpan={6}>
                        <Link href="https://getbootstrap.com/docs/5.3/layout/grid/#nesting">
                          Yes
                        </Link>
                      </td>
                    </tr>
                    <tr>
                      <th className="text-nowrap" scope="row">
                        Column ordering
                      </th>
                      <td colSpan={6}>
                        <Link href="https://getbootstrap.com/docs/5.3/layout/columns/#reordering">
                          Yes
                        </Link>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="col-span-12">
            <div className="card__wrapper">
              <div className="card__title-wrap mb-5">
                <h5 className="card__heading-title mb-2.5">Grid Column</h5>
                <p>
                  Using a single set of <code>.grid grid-cols-*</code> grid
                  classes, you can create a basic grid system that starts out
                  stacked on mobile devices and tablet devices (the extra small
                  to small range) before becoming horizontal on desktop (medium)
                  devices. Place grid columns within any
                  <code>.grid</code>.
                </p>
              </div>
              <div className="grid-showcase">
                <div className="grid grid-cols-12 gap-y-2.5 gap-x-5 maxXs:gap-x-2.5">
                  <div className="col-span-12 xl:col-span-1 text-center">
                    <span>xl:col-span-1</span>
                  </div>
                  <div className="col-span-12 xl:col-span-2 text-center">
                    <span>xl:col-span-2</span>
                  </div>
                  <div className="col-span-12 xl:col-span-2 text-center">
                    <span>xl:col-span-2</span>
                  </div>
                  <div className="col-span-12 xl:col-span-3 text-center">
                    <span>xl:col-span-3</span>
                  </div>
                  <div className="col-span-12 xl:col-span-4 text-center">
                    <span>xl:col-span-4</span>
                  </div>
                  <div className="col-span-12 xl:col-span-5 text-center">
                    <span>xl:col-span-5</span>
                  </div>
                  <div className="col-span-12 xl:col-span-7 text-center">
                    <span>xl:col-span-7</span>
                  </div>
                  <div className="col-span-12 xl:col-span-6 text-center">
                    <span>xl:col-span-6</span>
                  </div>
                  <div className="col-span-12 xl:col-span-6 text-center">
                    <span>xl:col-span-6</span>
                  </div>
                  <div className="col-span-12 xl:col-span-8 text-center">
                    <span>xl:col-span-8</span>
                  </div>
                  <div className="col-span-12 xl:col-span-4 text-center">
                    <span>xl:col-span-4</span>
                  </div>
                  <div className="col-span-12 xl:col-span-9 text-center">
                    <span>xl:col-span-9</span>
                  </div>
                  <div className="col-span-12 xl:col-span-3 text-center">
                    <span>xl:col-span-3</span>
                  </div>
                  <div className="col-span-12 xl:col-span-10 text-center">
                    <span>xl:col-span-10</span>
                  </div>
                  <div className="col-span-12 xl:col-span-2 text-center">
                    <span>xl:col-span-2</span>
                  </div>
                  <div className="col-span-12 xl:col-span-12 text-center">
                    <span>xl:col-span-12</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-span-12">
            <div className="card__wrapper">
              <div className="card__title-wrap mb-5">
                <h5 className="card__heading-title mb-2.5">Row columns</h5>
                <p>
                  Use the responsive <code>.cols-span-*</code> classes to
                  quickly set the number of columns that best render your
                  content and layout. Whereas normal <code>.col-span-12</code>{" "}
                  classes apply to the individual columns (e.g.,
                  .md:col-span-4), the row columns classes are set on the parent{" "}
                  <code>.grid grid-cols-12</code> as a default for contained
                  columns. With
                </p>
              </div>
              <div className="grid-showcase">
                <div className="grid grid-cols-12 gap-y-2.5 gap-x-5 maxXs:gap-x-2.5">
                  <div className="col-span-6 xl:col-span-4">
                    <span>xl:col-span-4</span>
                  </div>
                  <div className="col-span-6 xl:col-span-4">
                    <span>xl:col-span-4</span>
                  </div>
                  <div className="col-span-6 xl:col-span-4">
                    <span>xl:col-span-4</span>
                  </div>
                  <div className="col-span-6 xl:col-span-4">
                    <span>xl:col-span-4</span>
                  </div>
                  <div className="col-span-6 xl:col-span-4">
                    <span>xl:col-span-4</span>
                  </div>
                  <div className="col-span-6 xl:col-span-4">
                    <span>xl:col-span-4</span>
                  </div>
                  <div className="col-span-4 xl:col-span-2">
                    <span>xl:col-span-2</span>
                  </div>
                  <div className="col-span-4 xl:col-span-2">
                    <span>xl:col-span-2</span>
                  </div>
                  <div className="col-span-4 xl:col-span-2">
                    <span>xl:col-span-2</span>
                  </div>
                  <div className="col-span-4 xl:col-span-2">
                    <span>xl:col-span-2</span>
                  </div>
                  <div className="col-span-4 xl:col-span-2">
                    <span>xl:col-span-2</span>
                  </div>
                  <div className="col-span-4 xl:col-span-2">
                    <span>xl:col-span-2</span>
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

export default GridMainArea;
