export default function StudentPage() {
    return (
      <main className="
        w-screen
        h-screen
        flex
        items-center
        justify-center
        bg-sky-100
      ">
  
        <div className="
          bg-white
          p-10
          rounded-3xl
          shadow-xl
          text-center
        ">
          <h1 className="text-3xl font-bold mb-6">
            학교를 선택해주세요
          </h1>
  
          <button className="
            px-6
            py-4
            bg-sky-500
            text-white
            rounded-2xl
            text-xl
          ">
            학교 선택
          </button>
        </div>
  
      </main>
    );
  }