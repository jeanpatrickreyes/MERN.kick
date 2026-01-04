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
import { Add } from "@mui/icons-material";
import { Dialog, DialogActions, DialogContent, DialogTitle, TextField, Button, Box, IconButton, Tooltip, FormControl, InputLabel, Select, MenuItem, FormHelperText } from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import { toast, ToastContainer } from "react-toastify";
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { useMembers } from "../../../hooks/useMember";
import AppGlobal from "../../../ultis/global";
import API from "../../../api/api";
import { Member } from "../../../models/member";
import AppBarComponent from "../../../components/appBar";
import ThemedText from "../../../components/themedText";
import useIsMobile from "../../../hooks/useIsMobile";

function MembersPage() {
    const { t } = useTranslation();
    const isMobile = useIsMobile();
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [sorting, setSorting] = useState<SortingState>([]);
    const { data } = useMembers(page, pageSize);
    const [openDialog, setOpenDialog] = useState(false);
    const [deleteId, setDeleteId] = useState<string>();
    const [editId, setEditId] = useState<string>();
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        price: "",
        date: "",
        ageRange: "",
    });
    const [errors, setErrors] = useState({
        email: "",
        password: "",
        price: "",
        date: "",
        ageRange: "",
    });

    const validateForm = () => {
        let isValid = true;
        let tempErrors = { email: "", password: "", price: "", date: "", ageRange: "" };
        if (!formData.email) {
            tempErrors.email = t("usernameRequired");
            isValid = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            tempErrors.email = t("usernameRequired");
            isValid = false;
        }
        if (!editId) {
            if (!formData.password || formData.password.length < 6) {
                tempErrors.password = t("passwordRequired");
                isValid = false;
            }
        }
        if (!formData.price) {
            tempErrors.price = t("priceRequired");
            isValid = false;
        }
        if (!editId) {
            if (!formData.date) {
                tempErrors.date = t("dateRequired");
                isValid = false;
            }
        }
        if (!formData.ageRange) {
            tempErrors.ageRange = t("ageRangeRequired");
            isValid = false;
        }

        setErrors(tempErrors);
        return isValid;
    };

    const handleFormSubmit = async () => {
        if (validateForm()) {
            try {
                if (editId) {
                    console.log(formData);
                    const res = await API.PUT(`${AppGlobal.baseURL}admin/member/${editId}`, formData);
                    if (res.status == 200) {
                        queryClient.invalidateQueries({
                            queryKey: ["members", page, pageSize],
                        });
                        toast.success("🎉 " + t("memberEditedSuccessfully"));
                    } else if (res.status == 409) {
                        alert(res.data.error)
                        return;

                    }
                } else {
                    const res = await API.POST(`${AppGlobal.baseURL}admin/member`, formData);
                    if (res.status == 200) {
                        queryClient.invalidateQueries({
                            queryKey: ["members", page, pageSize],
                        });
                        toast.success("🎉 " + t("memberAddedSuccessfully"));
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

    const columns: ColumnDef<Member>[] = [
        {
            accessorKey: "email",
            header: () => <span className="sm:text-base text-xs font-medium">{t("email")}</span>,
            cell: (props: any) => (
                <span className="sm:text-base text-xs">{props.getValue()}</span>
            ),
        },
        {
            accessorKey: "date",
            header: () => <span className="sm:text-base text-[10px] font-medium">{"VIP到期時間"}</span>,
            cell: (props: any) => (
                <Box sx={{ display: "flex", gap: 1 }}>
                    {(() => {
                        const value = props.getValue();
                        const days = value ? getDays(value) : null;
                        return days !== null && days > 0 ? (
                            <span className="bg-green-500 text-white sm:px-4 sm:py-2 px-2 py-1 rounded shadow font-bold">
                                {days + "天"}
                            </span>
                        ) : undefined;
                    })()}
                </Box>
            ),
        },
        {
            accessorKey: "ageRange",
            header: () => <span className="sm:text-base text-xs font-medium">{t("ageRange")}</span>,
            cell: (props: any) => (
                <span className="sm:text-base text-[8px]">{props.getValue()}</span>
            ),
        },
        ...(!isMobile
            ? [
                {
                    accessorKey: "created_at",
                    header: () => (
                        <span className="sm:text-base text-xs font-medium">
                            {t("createdAt")}
                        </span>
                    ),
                    cell: (props: any) => {
                        const date = props.getValue();
                        const formattedDate = format(
                            new Date(date),
                            "yyyy年M月d日(E)",
                            {
                                locale: zhCN,
                            }
                        );
                        return formattedDate;
                    },
                },
            ]
            : []),
        {
            accessorKey: "operation",
            header: () => (
                <span className="sm:text-base text-xs font-medium">{t("operation")}</span>
            ),
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
        },
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
        const res = await API.DELETE(`${AppGlobal.baseURL}admin/member/${deleteId}`);
        if (res.status == 200) {
            queryClient.invalidateQueries({
                queryKey: ["members", page, pageSize],
            });
            toast.success(t("memberDeletedSuccessfully"));
        } else if (res.status == 409) {
            alert(res.data.error)
            return;

        }
        handleDialogCloseDelete();
    }

    const handleDialogClose = () => {
        setFormData({
            email: "",
            password: "",
            price: "",
            date: "",
            ageRange: "",
        })
        setErrors({
            email: "",
            password: "",
            price: "",
            date: "",
            ageRange: "",
        })
        setOpenDialog(false);
        setEditId(undefined);
    };

    const handleDialogOpen = () => {
        setOpenDialog(true);
    };

    const handleEdit = (e: Member) => {
        setEditId(e.id);
        setFormData({
            email: e.email,
            password: "",
            price: e.price,
            date: e.date,
            ageRange: e.ageRange || "",
        })
        setOpenDialog(true);
    };

    const handleDelete = (id: string) => {
        setDeleteId(id);
    };

    function getDays(date: any) {
        const hoje = new Date();
        const alvo = new Date(date);

        if (isNaN(alvo.getTime())) return null;

        const diffTime = alvo.getTime() - hoje.getTime();
        const diffDias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDias > 0 ? diffDias : null;
    }


    return (
        <div className="h-screen w-screen overflow-x-hidden bg-black">
            <ToastContainer position="top-right" autoClose={3000} />

            <AppBarComponent />

            <div className="mt-24 flex justify-center">
                <div className="bg-gray-900 p-6 rounded-lg shadow-lg w-5/6">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                        <ThemedText type="defaultSemiBold" className="text-xl" colorText="white">
                            {t("member")}
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
                                        <td key={cell.id} className="sm:p-3 p-3 border-b border-gray-600">
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
                    {editId ? t("editMember") : t("editMember")}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        label={t("email")}
                        fullWidth
                        margin="normal"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full p-3 mt-2 bg-[#f7f7e3] text-black border rounded-md border-[#a855f7] focus:outline-none focus:ring-2 focus:ring-[#a855f7]"
                        error={Boolean(errors.email)}
                        helperText={errors.email}
                    />
                    {editId ? <></> :
                        <TextField
                            label={t("password")}
                            fullWidth
                            margin="normal"
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full p-3 mt-2 bg-[#f7f7e3] text-black border rounded-md border-[#a855f7] focus:outline-none focus:ring-2 focus:ring-[#a855f7]"
                            error={Boolean(errors.password)}
                            helperText={errors.password}
                        />
                    }

                    <FormControl fullWidth error={!!errors.ageRange}>
                        <InputLabel id="age-label">{t("ageRange") || "Faixa Etária"}</InputLabel>
                        <Select
                            labelId="age-label"
                            id="age"
                            value={formData.ageRange}
                            onChange={(e) =>
                                setFormData({ ...formData, ageRange: e.target.value })
                            }
                            className="bg-[#f7f7e3] text-black rounded-md mt-2 border-none"
                        >
                            <MenuItem value="18-24">18-24</MenuItem>
                            <MenuItem value="25-34">25-34</MenuItem>
                            <MenuItem value="35-44">35-44</MenuItem>
                            <MenuItem value="45-54">45-54</MenuItem>
                            <MenuItem value="55+">55+</MenuItem>
                        </Select>
                        {errors.ageRange && (
                            <FormHelperText>{errors.ageRange}</FormHelperText>
                        )}
                    </FormControl>



                    <TextField
                        label={t("price")}
                        fullWidth
                        margin="normal"
                        type="number"
                        value={formData.price}
                        onChange={(e) => {
                            const value = e.target.value;
                            if (/^\d*\.?\d{0,2}$/.test(value)) {
                                setFormData({ ...formData, price: value });
                            }
                        }}
                        inputProps={{
                            min: "0",
                            step: "0.01"
                        }}
                        className="w-full p-3 mt-2 bg-[#f7f7e3] text-black border rounded-md border-[#a855f7] focus:outline-none focus:ring-2 focus:ring-[#a855f7]"
                        error={Boolean(errors.price)}
                        helperText={errors.price}
                    />

                    <TextField
                        label={t("date")}
                        fullWidth
                        margin="normal"
                        type="date"
                        value={formData.date ?? ""}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        InputLabelProps={{
                            shrink: true,
                        }}
                        inputProps={{
                            min: new Date().toISOString().split("T")[0]
                        }}
                        className="w-full p-3 mt-2 bg-[#f7f7e3] text-black border rounded-md border-[#a855f7] focus:outline-none focus:ring-2 focus:ring-[#a855f7]"
                        error={Boolean(errors.date)}
                        helperText={errors.date}
                    />

                    {formData.date && new Date(formData.date) > new Date() && (
                        <div className="flex justify-start mt-4 w-full items-start">
                            <span className="bg-green-500 text-white px-4 py-2 rounded shadow font-bold">
                                VIP 到期時間
                            </span>
                        </div>
                    )}


                </DialogContent>
                <DialogActions>
                    <Button onClick={handleDialogClose} color="secondary">
                        {t("cancel")}
                    </Button>
                    <Button onClick={handleFormSubmit} color="primary">
                        {t("save")}
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}

export default MembersPage;
