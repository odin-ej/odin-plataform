const UserPhraseStatus = ({ phraseStatus  }: { phraseStatus: string }) => {
  
  return (
    <div className="absolute -top-5 left-6 z-50 bg-[#f5b719] border border-gray-700 rounded-lg px-3 py-1 text-sm after:content-[''] after:absolute after:bottom-[-6px] after:left-1 after:border-t-8 after:border-t-[#f5b719] after:border-x-8 after:border-x-transparent">
      {phraseStatus}
    </div>
  );
};

export default UserPhraseStatus;
