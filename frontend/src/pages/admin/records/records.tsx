import { useState } from "react";
import {
    useReactTable,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    flexRender,
    ColumnDef,
    SortingState,
} from "@tanstack/react-table";
import { Member } from "../../../models/member";
import AppBarComponent from "../../../components/appBar";
import ThemedText from "../../../components/themedText";
import { Add } from "@mui/icons-material";
import { Dialog, DialogActions, DialogContent, DialogTitle, TextField, Button, Box, IconButton, Tooltip } from "@mui/material";
import API from "../../../api/api";
import AppGlobal from "../../../ultis/global";
import { useQueryClient } from "@tanstack/react-query";
import { toast, ToastContainer } from "react-toastify";
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { useRecords } from "../../../hooks/useRecords";
import { Records } from "../../../models/records";

function RecordsAdminPage() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [sorting, setSorting] = useState<SortingState>([]);
    const { data } = useRecords(page, pageSize);
    const [openDialog, setOpenDialog] = useState(false);
    const [deleteId, setDeleteId] = useState<string>();
    const [editId, setEditId] = useState<string>();
    const [description, setDescription] = useState("");
    const [date, setDate] = useState(() => {
        const today = new Date();
        const formatted = today.toISOString().split("T")[0];
        return formatted;
    });
    const [selectedMedia, setSelectedMedia] = useState<File[]>([]);
    const [selectedMediaPaths, setSelectedMediaPaths] = useState<string[]>([]);

    const [errors, setErrors] = useState({
        description: "",
        title: "",
        date: "",
    });

    const handleRemoveImage = (index: number) => {
        setSelectedMedia((prev) => prev.filter((_, i) => i !== index));
    };

    const validateForm = () => {

        let isValid = true;
        let tempErrors = { description: "", title: "", date: "" };
        if (!description) {
            tempErrors.description = t("descriptionRequired");
            isValid = false;
        } if (!date) {
            tempErrors.date = t("dataRequired");
            isValid = false;
        }

        console.log("tempErrors", tempErrors);
        setErrors(tempErrors);
        return isValid;
    };

    const handleFormSubmit = async () => {
        if (validateForm()) {
            const r = {
                title: "",
                mediaPaths: selectedMediaPaths ?? [],
                description: description,
                date: date ? new Date(date) : new Date(),
                media: selectedMedia,
            };

            try {
                if (editId) {
                    const formData = new FormData();
                    formData.append("title", "");
                    formData.append("description", r.description);
                    formData.append("mediaPaths", JSON.stringify(r.mediaPaths));
                    formData.append("date", r.date.toISOString());
                    for (const file of r.media) {
                        let compressed = file;
                        formData.append("media", compressed);
                    }
                    const res = await API.POSTFORMDATA(`${AppGlobal.baseURL}records/${editId}`, formData);
                    if (res.status == 200) {
                        queryClient.invalidateQueries({
                            queryKey: ["records", page, pageSize],
                        });
                        toast.success("🎉 " + t("recordAddedSuccessfully"));
                    } else if (res.status == 409) {
                        alert(res.data.error)
                        return;
                    }
                } else {
                    const formData = new FormData();
                    formData.append("title", "");
                    formData.append("description", r.description);
                    formData.append("mediaPaths", JSON.stringify(r.mediaPaths));
                    formData.append("date", r.date.toISOString());
                    for (const file of r.media) {
                        let compressed = file;
                        formData.append("media", compressed);
                    }
                    const res = await API.POSTFORMDATA(`${AppGlobal.baseURL}records`, formData);
                    if (res.status == 200) {
                        queryClient.invalidateQueries({
                            queryKey: ["records", page, pageSize],
                            refetchType: "active"
                        });

                        toast.success("🎉 " + t("recordAddedSuccessfully"));
                    } else if (res.status == 409) {
                        alert(res.data.error)
                        return;
                    }
                }
            } catch (error) {
                console.error("Erro:", error);
            }

            handleDialogClose();
        }
    };


    const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const total = selectedMedia.length + files.length + selectedMediaPaths.length;
        if (total > 5) {
            alert(t("limit_of_5_files", "最多 5 個文件"));
            return;
        }
        setSelectedMedia((prev) => [...prev, ...files]);
    };


    const columns: ColumnDef<Member>[] = [
        {
            header: () => <span className="sm:text-base text-xs font-medium">{t("date")}</span>,
            accessorKey: "date",
            cell: (props: any) => {
                const date = props.getValue();
                const formattedDate = format(new Date(date), "yyyy年M月d日(E)", {
                    locale: zhCN,
                });
                return formattedDate;
            },
        },
        {
            header: t("operation"),

            cell: (props: any) => (
                <Box sx={{ display: "flex", gap: 1 }}>
                    <Tooltip title={t("edit")}>
                        <IconButton
                            aria-label={t("edit")}
                            onClick={() => handleEdit(props.row.original)}
                        >
                            <EditIcon sx={{ fontSize: "1rem", color: "white" }} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={t("delete")}>
                        <IconButton
                            aria-label={t("delete")}
                            onClick={() => handleDelete(props.row.original.id)}
                        >
                            <DeleteIcon sx={{ fontSize: "1rem", color: "white" }} />
                        </IconButton>
                    </Tooltip>
                </Box>
            ),
            size: 100,
        }
    ];

    const table = useReactTable({
        data: data?.data || [],
        columns,
        pageCount: Math.ceil((data?.total || 0) / pageSize),
        state: {
            pagination: { pageIndex: page - 1, pageSize },
            sorting,
        },
        manualPagination: true,
        onPaginationChange: updater => {
            const newPagination = typeof updater === "function" ? updater({ pageIndex: page - 1, pageSize }) : updater;
            setPage(newPagination.pageIndex + 1);
            setPageSize(newPagination.pageSize);
        },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    const handleDialogCloseDelete = () => {
        setDeleteId(undefined);
    }

    const handleOnDelete = async () => {
        const res = await API.DELETE(`${AppGlobal.baseURL}records/${deleteId}`);
        if (res.status == 200) {
            queryClient.invalidateQueries({
                queryKey: ["records", page, pageSize],
            });
        } else if (res.status == 409) {
            alert(res.data.error)
            return;

        }
        handleDialogCloseDelete();
    }

    const handleDialogClose = () => {
        setDescription("");
        setSelectedMedia([]);
        setDate("");
        setSelectedMediaPaths([]);

        setErrors({
            description: "",
            title: "",
            date: ""
        })
        setOpenDialog(false);
        setEditId(undefined);
    };

    const handleDialogOpen = () => {
        setOpenDialog(true);
    };

    const handleEdit = (e: Records) => {
        setOpenDialog(true);
        setEditId(e.id);
        setSelectedMediaPaths(e.media ?? []);
        setSelectedMedia([]);
        setDescription(e.description);
        setDate(e.date.split("T")[0]);
    };

    const handleDelete = (id: string) => {
        setDeleteId(id);
    };



    return (
        <div className="h-screen w-screen overflow-x-hidden bg-black">
            <ToastContainer position="top-right" autoClose={3000} />
            <AppBarComponent />
            <div className="mt-24 flex justify-center">
                <div className="bg-gray-900 p-6 rounded-lg shadow-lg w-5/6">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                        <ThemedText type="defaultSemiBold" className="text-xl" colorText="white">
                            {t("records")}
                        </ThemedText>
                        <button
                            style={{ border: "none", cursor: "pointer" }}
                            className="bg-[#fc3a45] hover:bg-opacity-80 transition duration-200"
                            onClick={handleDialogOpen}
                        >
                            <Add className="text-white text-2xl" />
                        </button>
                    </div>

                    <table className="w-full border-collapse text-white">
                        <thead>
                            {table.getHeaderGroups().map(headerGroup => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map(header => (
                                        <th
                                            key={header.id}
                                            className="border-b border-gray-600 p-3 cursor-pointer font-bold text-base text-left"
                                            onClick={header.column.getToggleSortingHandler()}
                                        >
                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                            {{
                                                asc: " 🔼",
                                                desc: " 🔽",
                                            }[header.column.getIsSorted() as string] ?? ""}
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody>
                            {table.getRowModel().rows.map(row => (
                                <tr key={row.id} className="hover:bg-gray-700 transition-colors">
                                    {row.getVisibleCells().map(cell => (
                                        <td key={cell.id} className="p-3 border-b border-gray-600">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="mt-4 flex items-center justify-between text-white">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            className="bg-gray-700 px-3 py-1 rounded disabled:opacity-50"
                        >
                            {t("previous")}
                        </button>
                        <span>{t("page")} {page}</span>
                        <button
                            disabled={page * pageSize >= (data?.total || 0)}
                            onClick={() => setPage(p => p + 1)}
                            className="bg-gray-700 px-3 py-1 rounded disabled:opacity-50"
                        >
                            {t("next")}
                        </button>
                    </div>
                </div>
            </div>


            <Dialog
                open={deleteId ? true : false}
                onClose={handleDialogCloseDelete}
                sx={{
                    "& .MuiDialog-paper": {
                        backgroundColor: "white",
                        color: "white",
                        margin: 10,
                        borderRadius: "8px",
                    }
                }}
            >
                <DialogTitle style={{ color: "black" }}>
                    {t("areYouSureDelete")}
                </DialogTitle>
                <DialogActions>
                    <Button onClick={handleDialogCloseDelete} color="secondary">
                        {t("no")}
                    </Button>
                    <Button onClick={handleOnDelete} color="primary">
                        {t("yes")}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={openDialog}
                onClose={handleDialogClose}
                maxWidth="sm"
                fullWidth
                sx={{
                    "& .MuiDialog-paper": {
                        backgroundColor: "#f9f9f9",
                        color: "#333",
                        padding: 3,
                        borderRadius: "12px",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
                    },
                }}
            >
                <DialogTitle sx={{ color: "#222", fontWeight: "bold", fontSize: "1.3rem" }}>
                    {editId ? t("edit", "編輯") : t("create", "創造")}
                </DialogTitle>


                <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 3 }}>

                    <Button
                        variant="contained"
                        component="label"
                        sx={{
                            backgroundColor: "#ef4444",
                            "&:hover": {
                                backgroundColor: "#dc2626",
                            },
                        }}
                    >
                        {t("add_files")}
                        <input
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,video/mp4"
                            multiple
                            hidden
                            onChange={handleMediaChange}
                        />
                    </Button>


                    <Box
                        sx={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 2,
                        }}
                    >
                        {selectedMedia.map((img, index) => (
                            <Box key={index} sx={{ position: "relative" }}>
                                <img
                                    src={URL.createObjectURL(img)}
                                    alt={`preview-${index}`}
                                    width={100}
                                    height={100}
                                    style={{ objectFit: "cover", borderRadius: 8 }}
                                />
                                <IconButton
                                    size="small"
                                    sx={{
                                        position: "absolute",
                                        top: -8,
                                        right: -8,
                                        backgroundColor: "#fff",
                                        boxShadow: 1,
                                    }}
                                    onClick={() => handleRemoveImage(index)}
                                >
                                    ❌
                                </IconButton>
                            </Box>
                        ))}
                    </Box>

                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                        {selectedMediaPaths.map((img, index) => (
                            <Box key={index} sx={{ position: "relative" }}>
                                <img
                                    src={AppGlobal.baseURL.replace("/api/", "") + img}
                                    alt={`preview-${index}`}
                                    width={80}
                                    height={80}
                                    style={{ objectFit: "cover", borderRadius: 8 }}
                                />
                                <IconButton
                                    size="small"
                                    sx={{
                                        position: "absolute",
                                        top: -8,
                                        right: -8,
                                        backgroundColor: "#fff",
                                        boxShadow: 1,
                                    }}
                                    onClick={() => {
                                        const updated = selectedMediaPaths.filter((_, i) => i !== index);
                                        setSelectedMediaPaths(updated);
                                    }}
                                >
                                    ❌
                                </IconButton>
                            </Box>
                        ))}
                    </Box>

                    <TextField
                        label={t("date")}
                        type="date"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        error={Boolean(errors.date)}
                        helperText={errors.date}
                    />

                    <TextField
                        label={t("describe")}
                        multiline
                        rows={4}
                        fullWidth
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        error={Boolean(errors.description)}
                        helperText={errors.description}
                    />


                </DialogContent>

                <DialogActions sx={{ justifyContent: "flex-end", paddingX: 3, paddingBottom: 2 }}>
                    <Button onClick={handleDialogClose} color="inherit" variant="outlined">
                        {t("cancel")}
                    </Button>
                    <Button onClick={handleFormSubmit} sx={{
                        backgroundColor: "#ef4444",
                        "&:hover": {
                            backgroundColor: "#dc2626",
                        },
                    }} variant="contained">
                        {t("save")}
                    </Button>
                </DialogActions>
            </Dialog>

        </div>
    );
}

export default RecordsAdminPage;
