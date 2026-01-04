import { Fragment, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Box, IconButton } from "@mui/material";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";
import { useRecords } from "../../hooks/useRecords";
import AppGlobal from "../../ultis/global";
import { Records } from "../../models/records";
import AppBarComponent from "../../components/appBar";



const RecordsPage = () => {
    const [page, setPage] = useState<number>(1);
    const limite = 20;
    const { data, isLoading } = useRecords(page, limite);
    const [readMore, setReadMore] = useState<string | null>(null);

    const records = data?.data || [];
    const totalPages = data?.totalPages || 1;

    const { t } = useTranslation();

    return (
        <Fragment>
            <div className="h-screen w-screen overflow-x-hidden bg-red-500">
                <AppBarComponent />

                <div className="relative z-10 w-full flex items-center flex-col pl-10 pt-20">
                    <div className="relative z-10 w-full flex items-end sm:h-[20vh] h-[10vh]">
                        <div className="flex flex-1 items-center pl-5">
                            <div className="w-5 bg-white mr-4 self-stretch" />
                            <div className="flex flex-col justify-center space-y-2 text-white">
                                <p className="sm:text-5xl text-3xl font-semibold leading-tight">
                                    {t("Explore_our_analysis").toUpperCase()}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="w-screen flex-col pt-20 pl-5 pr-5 flex items-center">


                    <div className="container">


                        <RecordList
                            page={page}
                            setPage={setPage}
                            records={records}
                            totalPages={totalPages}
                            loading={isLoading}
                            readMore={readMore}
                            setReadMore={setReadMore}
                        />
                    </div>
                    <div className="shapes shape-one" />
                </div>
            </div>
        </Fragment>
    );
};

interface RecordListProps {
    page: number;
    setPage: (page: number) => void;
    records: Records[];
    totalPages: number;
    loading: boolean;
    readMore: string | null;
    setReadMore: (id: string | null) => void;
}

const RecordList = ({ page, setPage, records, totalPages, loading, readMore, setReadMore }: RecordListProps) => {
    const [expandedImage, setExpandedImage] = useState<string | null>(null);
    const [columnCount, setColumnCount] = useState<number>(getColumnCount());
    const [hovered, setHovered] = useState<string | undefined>();
    const [fadeIn, setFadeIn] = useState(false);
    const { t } = useTranslation();

    function getColumnCount() {
        if (typeof window !== "undefined") {
            if (window.innerWidth >= 768) return 2;
        }
        return 1;
    }

    useEffect(() => {
        const handleResize = () => setColumnCount(getColumnCount());
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => setFadeIn(true), 500);
        return () => clearTimeout(timer);
    }, []);

    return (
        <Fragment>
            <div className="container pt-30 ">
                {loading ? (
                    <div className="w-6 h-6  mb-2 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                    <div
                        style={{
                            minHeight: 'calc(100vh - 400px)',
                            display: 'grid',
                            gridTemplateColumns: columnCount === 1 ? '1fr' : '1fr 1fr',
                            gap: '20px',
                            alignItems: 'start',
                            opacity: fadeIn ? 1 : 0,
                            transition: 'opacity 1s ease-out',
                        }}
                    >
                        {records.length === 0 ? <div style={{ height: 300 }} /> : (
                            records.map((record) => (
                                <div
                                    key={record.id}
                                    className="bg-white rounded-xl p-5 shadow-md hover:shadow-xl hover:scale-[1.02] transition-transform duration-300 ease-in-out cursor-pointer"
                                >
                                    <div style={{ width: '100%' }}>
                                        {record.media?.length === 1 ? (
                                            <div style={{ overflow: 'hidden', borderRadius: 12 }}>
                                                <RenderMediaItem width={"100%"} mediaItem={record.media[0]} index={0} setExpandedImage={setExpandedImage} />
                                            </div>
                                        ) : (
                                            <div style={{ justifyContent: 'center', alignItems: 'center', width: '100%', margin: '0 auto' }}>
                                                <MediaGrid record={record} setExpandedImage={setExpandedImage} />
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ marginTop: 15 }}>
                                        <small className="text-muted" style={{ fontSize: 13, color: "black" }}>
                                            {format(new Date(record.date), 'yyyy年M月d日(E)', { locale: zhCN })}
                                        </small>
                                        <DescriptionBox record={record} readMore={readMore} />
                                        <div style={{ textAlign: 'left', marginBottom: -10 }}>
                                            <div
                                                onMouseEnter={() => setHovered(record.id)}
                                                onMouseLeave={() => setHovered(undefined)}
                                                style={{
                                                    fontSize: 15,
                                                    cursor: 'pointer',
                                                    color: record.id === hovered ? '#5b88a5' : '#198754',
                                                    fontWeight: 600,
                                                }}
                                                className="text-decoration-underline"
                                                onClick={() => setReadMore(readMore === record.id ? null : record.id)}
                                            >
                                                {readMore === record.id ? t("收起") : t("閱讀更多")}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                <div className="text-center mt-4 mb-4">
                    {Array.from({ length: totalPages }, (_, i) => (
                        <button
                            key={i}
                            onClick={() => setPage(i + 1)}
                            className={`btn btn-sm mx-1 ${page === i + 1 ? "btn-success" : "btn-outline-secondary"}`}
                        >
                            {i + 1}
                        </button>
                    ))}
                </div>
            </div>

            {expandedImage && (
                <div
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)', display: 'flex',
                        justifyContent: 'center', alignItems: 'center', zIndex: 1000,
                    }}
                    onClick={() => setExpandedImage(null)}
                >
                    <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }}>
                        <img src={expandedImage} alt="expanded" style={{ maxWidth: 300, width: '100%', height: 'auto', objectFit: 'contain' }} />
                    </div>
                </div>
            )}
        </Fragment>
    );
};

const DescriptionBox = ({ record, readMore }: { record: Records; readMore: string | null }) => {
    const contentRef = useRef<HTMLParagraphElement>(null);
    const [height, setHeight] = useState<number>(130);

    useEffect(() => {
        if (readMore === record.id && contentRef.current) {
            setHeight(contentRef.current.scrollHeight);
        } else {
            setHeight(130);
        }
    }, [readMore, record.id]);

    return (
        <div style={{ maxHeight: height, overflow: "hidden", transition: "max-height 0.4s ease", color: "black" }}>
            <p ref={contentRef} style={{ fontSize: 14, whiteSpace: "pre-wrap", margin: 0 }}>
                {record.description}
            </p>
        </div>
    );
};

const RenderMediaItem = ({ mediaItem, index, setExpandedImage, height, width }: {
    mediaItem: string;
    index: number;
    setExpandedImage: (url: string) => void;
    height?: number;
    width?: any;
}) => {
    const isVideo = mediaItem.includes(".mp4");
    const commonStyle: React.CSSProperties = {
        width: width ?? "50%",
        height: height ?? "100%",
        maxHeight: 350,
        objectFit: 'contain',
        borderRadius: 6,
        cursor: !isVideo ? "pointer" : "default",
    };

    const [isLoading, setIsLoading] = useState(true);
    const videoRef = useRef<HTMLVideoElement | null>(null);

    const handleCanPlay = () => setIsLoading(false);

    const handleError = (e: any) => {
        e.target.poster = "images/gallery/image5.png";
    };

    const isIPhoneSafari = () => {
        const ua = navigator.userAgent;
        return /iPhone/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS/.test(ua);
    };

    return isVideo ? (
        <div style={{ position: 'relative' }}>
            <video
                ref={videoRef}
                key={index}
                preload="auto"
                autoPlay={isIPhoneSafari()}
                src={AppGlobal.baseURL.replace("/api/", "") + mediaItem}
                controls
                style={commonStyle}
                poster={isLoading ? "images/gallery/image5.png" : ""}
                onCanPlayThrough={handleCanPlay}
                onError={handleError}
            />
        </div>
    ) : (
        <img
            key={index}
            src={AppGlobal.baseURL.replace("/api/", "") + mediaItem}
            alt={`media-${index}`}
            style={commonStyle}
            onClick={() => setExpandedImage(AppGlobal.baseURL.replace("/api/", "") + mediaItem)}
        />
    );
};

const MediaGrid = ({ record, setExpandedImage }: { record: Records; setExpandedImage: (url: string) => void }) => {
    const media = record.media;
    const itemsPerPage = 2;
    const maxPages = Math.ceil(media.length / itemsPerPage);
    const [page, setPage] = useState(0);

    const handleNext = () => {
        if (page < maxPages - 1) setPage(page + 1);
    };

    const handlePrev = () => {
        if (page > 0) setPage(page - 1);
    };

    const currentItems = media.slice(page * itemsPerPage, (page + 1) * itemsPerPage);

    return (
        <Box>
            <Box display="flex" gap={2} justifyContent="center" mb={1}>
                {currentItems.map((item, index) => (
                    <RenderMediaItem key={index} mediaItem={item} index={index} setExpandedImage={setExpandedImage} />
                ))}
            </Box>
            <Box display="flex" justifyContent="center" gap={2}>
                <IconButton onClick={handlePrev} disabled={page === 0}>
                    <ChevronLeft />
                </IconButton>
                <IconButton onClick={handleNext} disabled={page === maxPages - 1}>
                    <ChevronRight />
                </IconButton>
            </Box>
        </Box>
    );
};

export default RecordsPage;