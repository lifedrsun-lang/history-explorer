"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

type Props = {
  students: any[];
  searchName: string;
  setSearchName: (
    value: string
  ) => void;
};

export default function SearchDropdown({
  students,
  searchName,
  setSearchName,
}: Props) {

  const [isOpen, setIsOpen] =
    useState(false);

  const wrapperRef =
    useRef<HTMLDivElement>(null);

  // 검색 목록

  const filteredList =
    searchName.trim() === ""
      ? []
      : students
          .filter((student) =>
            student.name
              ?.trim()
              .includes(
                searchName.trim()
              )
          )
          .slice(0, 5);

  // 바깥 클릭 닫기

  useEffect(() => {

    const handleClickOutside = (
      event: MouseEvent
    ) => {

      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(
          event.target as Node
        )
      ) {

        setIsOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {

      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };

  }, []);

  // ESC 닫기

  useEffect(() => {

    const handleEsc = (
      event: KeyboardEvent
    ) => {

      if (event.key === "Escape") {

        setIsOpen(false);
      }
    };

    window.addEventListener(
      "keydown",
      handleEsc
    );

    return () => {

      window.removeEventListener(
        "keydown",
        handleEsc
      );
    };

  }, []);

  return (

    <div
      ref={wrapperRef}
      className="relative w-full"
    >

      <input
        type="text"
        placeholder="이름을 입력하세요"
        value={searchName}
        onChange={(e) => {

          setSearchName(
            e.target.value
          );

          setIsOpen(true);
        }}
        onFocus={() =>
          setIsOpen(true)
        }
        className="w-full bg-[#0d0d0d] border border-[#444] rounded-2xl px-5 py-3 text-xl text-white outline-none"
      />

      {isOpen &&
        filteredList.length > 0 && (

          <div className="absolute top-full left-0 w-full mt-2 bg-[#111] border border-[#333] rounded-2xl overflow-hidden z-50 shadow-2xl">

            {filteredList.map(
              (student) => (

                <button
                  key={student.id}
                  onClick={() => {

                    setSearchName(
                      student.name
                    );

                    setIsOpen(false);
                  }}
                  className="w-full text-left px-5 py-4 hover:bg-[#1a1a1a] border-b border-[#222] transition"
                >

                  <div className="text-lg font-bold">

                    {student.name}

                  </div>

                  <div className="text-sm text-gray-400">

                    {student.grade}학년
                    {" "}
                    {student.class}반

                  </div>

                </button>

              )
            )}

          </div>

        )}

    </div>

  );
}